import Link from "next/link";
import Button from "@/components/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted pt-20">
      <div className="text-center px-6">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Eroare 404
        </p>
        <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          Pagina nu a fost găsită
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
          Ne pare rău, pagina pe care o căutați nu există sau a fost mutată.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button href="/">Înapoi la pagina principală</Button>
          <Button href="/contact" variant="outline">
            Contactați-ne
          </Button>
        </div>
      </div>
    </div>
  );
}
