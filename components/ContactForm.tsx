"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "./Button";
import { secureFetch } from "@/lib/csrf-client";

interface ContactFormProps {
  className?: string;
  defaultService?: string;
}

export default function ContactForm({
  className = "",
  defaultService,
}: ContactFormProps) {
  const t = useTranslations("ContactForm");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: defaultService || "Consultație",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await secureFetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t("eroare"));
      }

      setStatus("success");
      setFormData({
        name: "",
        phone: "",
        email: "",
        service: "Consultație",
        message: "",
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : t("eroare"));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (status === "success") {
    return (
      <div className={`bg-muted p-8 text-center ${className}`}>
        <h3 className="font-serif text-xl font-medium text-foreground">
          {t("multumim")}
        </h3>
        <p className="mt-3 text-muted-foreground">{t("vomContacta")}</p>
        <Button
          onClick={() => setStatus("idle")}
          variant="outline"
          className="mt-6"
        >
          {t("trimitAltMesaj")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-foreground"
          >
            {t("numeComplet")}
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-2 block w-full border border-border bg-white px-4 py-3 text-foreground placeholder-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            placeholder={t("numeleDvs")}
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-foreground"
          >
            {t("telefon")}
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="mt-2 block w-full border border-border bg-white px-4 py-3 text-foreground placeholder-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            placeholder={t("nrTelefon")}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            {t("emailOptional")}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-2 block w-full border border-border bg-white px-4 py-3 text-foreground placeholder-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <div>
          <label
            htmlFor="service"
            className="block text-sm font-medium text-foreground"
          >
            {t("serviciuDorit")}
          </label>
          <div className="relative mt-2">
            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
              className="block w-full appearance-none border border-border bg-white px-4 py-3 pr-10 text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="Consultație">{t("consultatie")}</option>
              <option value="Implantologie Dentară">
                {t("implantologieDentara")}
              </option>
              <option value="Chirurgie Orală">{t("chirurgieOrala")}</option>
              <option value="Estetică Dentară">{t("esteticaDentara")}</option>
              <option value="Protetică Dentară">{t("proteticaDentara")}</option>
              <option value="Ortodonție">{t("ortodontie")}</option>
              <option value="Endodonție">{t("endodontie")}</option>
              <option value="Parodontologie">{t("parodontologie")}</option>
              <option value="Pedodonție">{t("pedodontie")}</option>
              <option value="Igienizare profesională">{t("igienizare")}</option>
              <option value="Albire dentară">{t("albireDentara")}</option>
              <option value="Altul">{t("altul")}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-foreground"
          >
            {t("mesaj")}
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            value={formData.message}
            onChange={handleChange}
            className="mt-2 block w-full border border-border bg-white px-4 py-3 text-foreground placeholder-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
            placeholder={t("mesajPlaceholder")}
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <Button
          type="submit"
          disabled={status === "loading"}
          className="w-full"
        >
          {status === "loading" ? t("seTrimite") : t("trimiteMesajul")}
        </Button>
      </div>
    </form>
  );
}
