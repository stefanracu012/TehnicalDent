"use client";

import { useState } from "react";
import Link from "next/link";
import { secureFetch } from "@/lib/csrf-client";
import { LEAD_STATUSES, getStatus } from "@/lib/leads-config";
import type { InboxConversation } from "@/lib/inbox";

/**
 * The lead's status, from inside the conversation.
 *
 * If the person is already a lead, its status changes without leaving the
 * chat. If not, one click makes them one — under the same key the webhooks use,
 * so their next message lands on this lead rather than opening a second.
 */
export default function ConversationLeadControl({
  conversation,
  onChange,
}: {
  conversation: InboxConversation;
  onChange: (lead: InboxConversation["lead"]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lead = conversation.lead;

  const changeStatus = async (status: string) => {
    if (!lead) return;
    const previous = lead.status;
    onChange({ ...lead, status }); // shown at once
    setSaving(true);
    setError(null);
    try {
      const res = await secureFetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Statusul nu s-a putut schimba.");
    } catch (e) {
      onChange({ ...lead, status: previous }); // and back, if it was refused
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const createLead = async () => {
    if (!conversation.person.id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await secureFetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:
            conversation.person.name !== conversation.person.id
              ? conversation.person.name
              : "",
          phone: conversation.platform === "whatsapp" ? conversation.person.id : "",
          sourceDetail: conversation.person.username ? `@${conversation.person.username}` : "",
          firstMessage: conversation.snippet || "",
          status: "contactat",
          conversation: {
            platform: conversation.platform,
            personId: conversation.person.id,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Leadul nu s-a putut crea.");
      onChange({ id: body.id, status: body.status, name: body.name });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!lead) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={createLead}
          disabled={saving || !conversation.person.id}
          className="px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 text-xs font-semibold hover:border-indigo-400 disabled:opacity-60 whitespace-nowrap"
        >
          {saving ? "…" : "+ Adaugă ca lead"}
        </button>
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>
    );
  }

  const status = getStatus(lead.status);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={lead.status}
          onChange={(e) => changeStatus(e.target.value)}
          disabled={saving}
          title="Statusul leadului"
          className={`px-2 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-60 ${status.className}`}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
        <Link
          href={`/admin/leads/${lead.id}`}
          className="text-[11px] text-gray-500 hover:text-gray-900 whitespace-nowrap"
          title="Deschide fișa leadului"
        >
          fișa ↗
        </Link>
      </div>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
