interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  alignment?: "left" | "center";
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  description,
  alignment = "center",
  className = "",
}: SectionHeaderProps) {
  const alignments = {
    left: "text-left",
    center: "text-center mx-auto",
  };

  return (
    <div className={`max-w-3xl ${alignments[alignment]} ${className}`}>
      {subtitle && (
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
          {subtitle}
        </p>
      )}
      <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
