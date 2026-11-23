import type { Metadata } from "next";

// The page a patient reaches from the WhatsApp or email link: one person's
// appointment, behind a token. Nothing there belongs in a search result.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppointmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
