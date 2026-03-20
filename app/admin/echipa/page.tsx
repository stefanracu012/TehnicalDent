import { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Echipa",
  robots: "noindex, nofollow",
};

export default function AdminTeamPage() {
  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Gestionare echipă
          </h1>
          <p className="mt-2 text-muted-foreground">
            Adăugați și editați membrii echipei
          </p>
        </div>

        <div className="bg-white border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Această secțiune va fi disponibilă în curând.
          </p>
          <p className="text-sm text-muted-foreground">
            Funcționalitatea de gestionare a echipei este în dezvoltare.
          </p>
        </div>
      </div>
    </div>
  );
}
