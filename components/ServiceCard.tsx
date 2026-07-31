import Image from "next/image";
import Link from "next/link";

interface ServiceCardProps {
  title: string;
  description: string;
  image: string;
  href: string;
}

export default function ServiceCard({
  title,
  description,
  image,
  href,
}: ServiceCardProps) {
  return (
    <Link href={href} className="group block">
      <article className="h-full">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="pt-6">
          <h3 className="font-serif text-xl font-medium text-foreground transition-colors duration-200 group-hover:text-accent">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {description}
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-foreground relative">
            Află mai multe
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all duration-200 group-hover:w-full" />
          </span>
        </div>
      </article>
    </Link>
  );
}
