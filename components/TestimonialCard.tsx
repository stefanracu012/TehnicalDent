interface TestimonialCardProps {
  name: string;
  content: string;
  service?: string;
}

export default function TestimonialCard({
  name,
  content,
  service,
}: TestimonialCardProps) {
  return (
    <article className="bg-white p-8 lg:p-10 border border-border">
      <blockquote>
        <p className="text-base leading-relaxed text-foreground italic">
          &ldquo;{content}&rdquo;
        </p>
      </blockquote>
      <div className="mt-6">
        <p className="font-medium text-foreground">{name}</p>
        {service && (
          <p className="mt-1 text-sm text-muted-foreground">{service}</p>
        )}
      </div>
    </article>
  );
}
