/** A lead as the admin API returns it. Dates are ISO strings. */
export interface LeadItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  sourceDetail: string | null;
  firstMessage: string | null;
  interestedIn: string | null;
  status: string;
  note: string | null;
  followUpAt: string | null;
  patientId: string | null;
  assignedToId: string | null;
  assignedToName?: string | null;
  notesCount?: number;
  /** Who to open in the inbox, for leads that came from a chat. */
  conversation?: { platform: "messenger" | "instagram" | "whatsapp"; personId: string } | null;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
}

export interface LeadNoteItem {
  id: string;
  content: string;
  authorName: string | null;
  createdAt: string;
}

/** Link to the inbox, opened on one person's conversation. */
export function conversationHref(c: NonNullable<LeadItem["conversation"]>): string {
  return `/admin/mesaje?platform=${c.platform}&person=${encodeURIComponent(c.personId)}`;
}
