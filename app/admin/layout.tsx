import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "../globals.css";
import AdminNav from "@/components/admin/AdminNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin | TechnicalDent",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ro"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="h-screen flex flex-col md:flex-row bg-background text-foreground font-sans overflow-hidden">
        <AdminNav />
        <main className="flex-1 h-screen overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
