"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BookingForm from "./BookingForm";
import ContactForm from "./ContactForm";

/**
 * The two things a visitor can do on /contact: book a time from the doctors'
 * calendars, or leave a message and be called. Booking comes first — it is
 * what most people came to do — and the message form stays for questions and
 * for when nothing is free.
 */
export default function ContactTabs({ defaultService }: { defaultService?: string }) {
  const t = useTranslations("Booking");
  const [tab, setTab] = useState<"booking" | "message">("booking");

  const tabClass = (active: boolean) =>
    `flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
      active
        ? "border-foreground text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div>
      <div className="mb-8 flex border-b border-border" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "booking"}
          onClick={() => setTab("booking")}
          className={tabClass(tab === "booking")}
        >
          {t("tabProgramare")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "message"}
          onClick={() => setTab("message")}
          className={tabClass(tab === "message")}
        >
          {t("tabMesaj")}
        </button>
      </div>

      {tab === "booking" ? (
        <>
          <p className="mb-8 max-w-lg text-muted-foreground">{t("descriere")}</p>
          <BookingForm defaultService={defaultService} onNoHours={() => setTab("message")} />
        </>
      ) : (
        <ContactForm defaultService={defaultService} />
      )}
    </div>
  );
}
