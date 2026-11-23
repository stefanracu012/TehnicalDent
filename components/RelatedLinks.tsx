import { Link } from "@/i18n/navigation";

/**
 * A short list of links between articles and services, so readers (and search
 * engines) can follow a topic from one to the other.
 */
export default function RelatedLinks({
  heading,
  items,
  className = "",
}: {
  heading: string;
  items: { href: string; title: string; hint?: string }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={heading} className={className}>
      <h2 className="font-serif text-xl font-medium text-foreground">{heading}</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-4 py-3 text-foreground transition-colors hover:text-accent"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.title}</span>
                {item.hint && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
              </span>
              <svg
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
