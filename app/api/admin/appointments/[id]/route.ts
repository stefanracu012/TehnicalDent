import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { checkOverlap, parseDateTime } from "@/lib/appointments";
import {
  notifyCancelled,
  notifyConfirmed,
  notifyCompleted,
  notifyNoshow,
  notifyPending,
} from "@/lib/notifications";
import {
  claimSlot,
  outsideOpenHours,
  reclaimSlotOnReactivate,
  releaseSlotByAppointment,
  SlotTakenError,
} from "@/lib/slots";
import { refreshDigestIfRelevant } from "@/lib/telegram-digest";
import {
  cancelReason,
  logStatusChange,
  panelActor,
  statusHistory,
  type ChangeVia,
} from "@/lib/appointment-log";
import type { AppointmentStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        service: true,
        notifications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!appt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ...appt, history: await statusHistory(id) });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const ALLOWED_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "noshow",
  "test",
];

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const rawBody = await request.json();
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(rawBody, ["notes"]);

    const current = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, service: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.dateTime !== undefined) {
      const dt = parseDateTime(body.dateTime);
      if (!dt) {
        return NextResponse.json({ error: "Data/ora invalidă." }, { status: 400 });
      }
      data.dateTime = dt;
    }

    if (body.serviceId !== undefined) {
      const svc = await prisma.service.findUnique({ where: { id: String(body.serviceId) } });
      if (!svc) {
        return NextResponse.json({ error: "Serviciul nu există." }, { status: 404 });
      }
      data.serviceId = svc.id;
      // recompute duration unless explicitly provided
      if (body.duration === undefined) data.duration = svc.duration || 30;
    }

    if (typeof body.duration === "number" && body.duration > 0) {
      data.duration = Math.round(body.duration);
    }

    if (typeof body.status === "string") {
      if (!ALLOWED_STATUSES.includes(body.status as AppointmentStatus)) {
        return NextResponse.json({ error: "Status invalid." }, { status: 400 });
      }
      data.status = body.status;
    }

    if (body.notes !== undefined) {
      data.notes = body.notes ? String(body.notes) : null;
    }

    if (body.teamMemberId !== undefined) {
      data.teamMemberId = body.teamMemberId ? String(body.teamMemberId) : null;
    }

    const nextDoctor =
      body.teamMemberId !== undefined
        ? (data.teamMemberId as string | null)
        : current.teamMemberId;
    const nextDateTime = (data.dateTime as Date) || current.dateTime;
    const nextDuration = (data.duration as number) || current.duration;
    const nextStatus = (data.status as AppointmentStatus | undefined) ?? current.status;
    // A cancelled or no-show appointment holds no hour, wherever it is moved.
    const holdsHour = nextStatus !== "cancelled" && nextStatus !== "noshow";

    // Overlap first, before any reservation moves: a refused edit used to
    // leave the new hour claimed and the old one released. Only when the
    // time, length or doctor really changes — the form sends all three on
    // every save, and editing a note must not ask about a parallel patient.
    const moved =
      nextDateTime.getTime() !== current.dateTime.getTime() ||
      nextDuration !== current.duration ||
      nextDoctor !== current.teamMemberId;
    if (moved && holdsHour) {
      const overlap = await checkOverlap({
        dateTime: nextDateTime,
        duration: nextDuration,
        excludeId: id,
        patientId: current.patientId,
        teamMemberId: nextDoctor,
      });
      if (overlap.verdict === "blocked") {
        return NextResponse.json(
          { error: overlap.message, conflictId: overlap.conflictId },
          { status: 409 },
        );
      }
      // Another doctor's patient at the same time, or an hour the doctor has
      // not opened: allowed once whoever moves it has read it and said yes.
      const timeChanged =
        nextDateTime.getTime() !== current.dateTime.getTime() || nextDoctor !== current.teamMemberId;
      const warnings = [
        overlap.verdict === "parallel" ? overlap.message : null,
        nextDoctor && timeChanged ? await outsideOpenHours(nextDoctor, nextDateTime) : null,
      ].filter((w): w is string => Boolean(w));
      if (warnings.length > 0 && body.acknowledged !== true) {
        return NextResponse.json(
          { error: warnings.join("\n"), needsConfirm: true },
          { status: 409 },
        );
      }
    }

    // Moving the appointment to a different doctor or hour means the old
    // reservation must be released and the new one claimed — otherwise the
    // vacated hour stays blocked and the new one stays bookable by others.
    const slotChanged =
      nextDoctor !== current.teamMemberId ||
      nextDateTime.getTime() !== current.dateTime.getTime();

    if (slotChanged) {
      await releaseSlotByAppointment(id);
      if (nextDoctor && holdsHour) {
        try {
          await claimSlot(nextDoctor, nextDateTime, id, { requireOpenHour: false });
        } catch (err) {
          // Put the original reservation back so a failed edit doesn't
          // silently free the slot the patient already had.
          if (current.teamMemberId) {
            await claimSlot(current.teamMemberId, current.dateTime, id, { requireOpenHour: false }).catch(() => {});
          }
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Slot indisponibil." },
            { status: err instanceof SlotTakenError ? 409 : 400 },
          );
        }
      }
    } else if (data.status !== undefined) {
      // Confirmed again after a cancellation: the hour has to be taken back,
      // or it shows as free and someone else is booked on top. Only when the
      // status is being set — editing notes must not fail over the hour.
      try {
        await reclaimSlotOnReactivate(current, nextStatus);
      } catch (err) {
        if (err instanceof SlotTakenError) {
          return NextResponse.json({ error: err.message }, { status: 409 });
        }
        throw err;
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: { patient: true, service: true },
    });

    // Cancelling frees the hour for someone else; the reservation row is
    // what booking checks against, so it has to go.
    if (data.status && data.status !== current.status) {
      if (data.status === "cancelled" || data.status === "noshow") {
        await releaseSlotByAppointment(id);
      }
    }

    // Status-change notifications
    if (data.status && data.status !== current.status) {
      // Kanban says so in the body; everything else here is the calendar.
      const via: ChangeVia = body.source === "kanban" ? "kanban" : "panou";
      const by = await panelActor();
      await logStatusChange(id, String(data.status), by, via);

      if (data.status === "confirmed") {
        notifyConfirmed(updated).catch((e) => console.error("notifyConfirmed:", e));
      } else if (data.status === "cancelled") {
        notifyCancelled(updated, cancelReason(by, via)).catch((e) =>
          console.error("notifyCancelled:", e),
        );
      } else if (data.status === "completed") {
        notifyCompleted(updated).catch((e) => console.error("notifyCompleted:", e));
      } else if (data.status === "noshow") {
        notifyNoshow(updated).catch((e) => console.error("notifyNoshow:", e));
      } else if (data.status === "pending") {
        notifyPending(updated).catch((e) => console.error("notifyPending:", e));
      } else if (data.status === "test") {
        // No notification for a housekeeping status — just make sure it
        // disappears from Azi/Mâine if it was showing there.
        refreshDigestIfRelevant(updated.dateTime).catch((e) => console.error("refreshDigest:", e));
      }
    } else if (data.dateTime) {
      // Pure reschedule (no status change) — refresh both the old and new
      // day's Telegram digest in case the appointment moved in/out of today/tomorrow.
      refreshDigestIfRelevant(current.dateTime).catch((e) => console.error("refreshDigest:", e));
      refreshDigestIfRelevant(updated.dateTime).catch((e) => console.error("refreshDigest:", e));
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const current = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, service: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await releaseSlotByAppointment(id);
    await prisma.appointment.delete({ where: { id } });
    notifyCancelled(current, "Șters din admin").catch((e) =>
      console.error("notifyCancelled (delete):", e),
    );
    return NextResponse.json({ message: "Appointment deleted" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
