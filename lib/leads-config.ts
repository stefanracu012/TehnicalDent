// =============================================
// The lead pipeline: statuses and sources, in one place.
//
// Shared by the pages (labels, colours, filters) and the API (validation), so
// a status can't be offered in a dropdown that the server then refuses.
//
// The stored values are the Prisma enum — keep them in step with
// prisma/schema.prisma. Only the labels here are free to change.
// =============================================

export type LeadStatusValue =
  | "nou"
  | "fara_raspuns"
  | "contactat"
  | "follow_up_1"
  | "follow_up_2"
  | "programat"
  | "a_venit"
  | "plan_tratament"
  | "se_gandeste"
  | "mai_tarziu"
  | "in_tratament"
  | "convertit"
  | "pierdut";

export type LeadSourceValue =
  | "messenger"
  | "instagram"
  | "whatsapp"
  | "formular"
  | "manual"
  | "telefon"
  | "recomandare"
  | "la_clinica"
  | "alta";

export interface LeadStatusInfo {
  value: LeadStatusValue;
  label: string;
  emoji: string;
  /** Badge colours, for the chip and the status dropdown. */
  className: string;
  /** nou = needs a first answer; lucru = being worked; castigat / pierdut = closed. */
  group: "nou" | "lucru" | "castigat" | "pierdut";
}

/** The order here is the order of the pipeline, and of every dropdown. */
export const LEAD_STATUSES: LeadStatusInfo[] = [
  { value: "nou", label: "Lead nou", emoji: "🔵", className: "bg-blue-100 text-blue-800 border-blue-300", group: "nou" },
  { value: "fara_raspuns", label: "Fără răspuns", emoji: "🔘", className: "bg-gray-100 text-gray-700 border-gray-300", group: "lucru" },
  { value: "contactat", label: "Contactat", emoji: "🟡", className: "bg-yellow-100 text-yellow-800 border-yellow-300", group: "lucru" },
  { value: "follow_up_1", label: "Follow up 1", emoji: "📞", className: "bg-yellow-50 text-yellow-800 border-yellow-200", group: "lucru" },
  { value: "follow_up_2", label: "Follow up 2", emoji: "📲", className: "bg-amber-50 text-amber-800 border-amber-200", group: "lucru" },
  { value: "programat", label: "Programat consultație", emoji: "📅", className: "bg-sky-100 text-sky-800 border-sky-300", group: "lucru" },
  { value: "a_venit", label: "A venit la consultație", emoji: "🟢", className: "bg-green-100 text-green-800 border-green-300", group: "lucru" },
  { value: "plan_tratament", label: "Plan de tratament", emoji: "📝", className: "bg-violet-100 text-violet-800 border-violet-300", group: "lucru" },
  { value: "se_gandeste", label: "Se gândește", emoji: "🤔", className: "bg-gray-100 text-gray-600 border-gray-300", group: "lucru" },
  { value: "mai_tarziu", label: "Interesat mai târziu", emoji: "🗓️", className: "bg-stone-100 text-stone-700 border-stone-300", group: "lucru" },
  { value: "in_tratament", label: "În tratament", emoji: "🦷", className: "bg-teal-100 text-teal-800 border-teal-300", group: "lucru" },
  { value: "convertit", label: "Pacient", emoji: "✅", className: "bg-emerald-100 text-emerald-800 border-emerald-300", group: "castigat" },
  { value: "pierdut", label: "Lead pierdut", emoji: "❌", className: "bg-red-100 text-red-800 border-red-300", group: "pierdut" },
];

export const LEAD_STATUS_VALUES = LEAD_STATUSES.map((s) => s.value);

/** A lead in one of these is finished: no follow-up is owed on it. */
export const CLOSED_STATUSES: LeadStatusValue[] = ["convertit", "pierdut"];

export function getStatus(value: string): LeadStatusInfo {
  return (
    LEAD_STATUSES.find((s) => s.value === value) ?? {
      value: value as LeadStatusValue,
      label: value,
      emoji: "⚪",
      className: "bg-gray-100 text-gray-600 border-gray-300",
      group: "lucru",
    }
  );
}

export interface LeadSourceInfo {
  value: LeadSourceValue;
  label: string;
  emoji: string;
  className: string;
  /** What to ask for in the free-text field once this source is picked. */
  detailLabel: string;
  /** Whether a person can pick it by hand. Messenger and the like are set by the inbox. */
  manual: boolean;
}

export const LEAD_SOURCES: LeadSourceInfo[] = [
  { value: "instagram", label: "Instagram", emoji: "📸", className: "bg-pink-100 text-pink-800", detailLabel: "Utilizator Instagram (ex: @tehnicaldent)", manual: true },
  { value: "messenger", label: "Messenger", emoji: "💬", className: "bg-indigo-100 text-indigo-800", detailLabel: "Profil Messenger (nume sau link)", manual: true },
  { value: "whatsapp", label: "WhatsApp", emoji: "🟢", className: "bg-green-100 text-green-800", detailLabel: "Număr WhatsApp (dacă diferă de telefon)", manual: true },
  { value: "telefon", label: "Telefon", emoji: "📞", className: "bg-teal-100 text-teal-800", detailLabel: "Detalii apel (opțional)", manual: true },
  { value: "recomandare", label: "Recomandare", emoji: "🤝", className: "bg-violet-100 text-violet-800", detailLabel: "Cine a recomandat", manual: true },
  { value: "la_clinica", label: "A venit la clinică", emoji: "🚪", className: "bg-orange-100 text-orange-800", detailLabel: "Detalii (opțional)", manual: true },
  { value: "formular", label: "Formular site", emoji: "🌐", className: "bg-cyan-100 text-cyan-800", detailLabel: "Pagina de proveniență", manual: false },
  { value: "manual", label: "Adăugat manual", emoji: "✍️", className: "bg-gray-100 text-gray-700", detailLabel: "Detalii (opțional)", manual: false },
  { value: "alta", label: "Altă sursă", emoji: "❓", className: "bg-gray-100 text-gray-700", detailLabel: "Descrie sursa", manual: true },
];

export const LEAD_SOURCE_VALUES = LEAD_SOURCES.map((s) => s.value);

export function getSource(value: string): LeadSourceInfo {
  return (
    LEAD_SOURCES.find((s) => s.value === value) ?? {
      value: value as LeadSourceValue,
      label: value || "Necunoscută",
      emoji: "❓",
      className: "bg-gray-100 text-gray-700",
      detailLabel: "Detalii",
      manual: false,
    }
  );
}

/** wa.me link for a stored number, or null when there are no usable digits. */
export function whatsAppLink(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
