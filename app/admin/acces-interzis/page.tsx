import Link from "next/link";

export default function AccesInterzisPage() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="bg-background border border-border p-8 sm:p-12 max-w-md text-center">
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Acces interzis
        </h1>
        <p className="mt-3 text-muted-foreground">
          Nu aveți permisiunea de a accesa această pagină. Contactați
          administratorul dacă credeți că este o eroare.
        </p>
        <Link
          href="/admin"
          className="inline-block mt-6 px-5 py-2.5 bg-foreground text-background text-sm font-medium"
        >
          Înapoi la panou
        </Link>
      </div>
    </div>
  );
}
