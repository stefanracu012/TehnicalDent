interface SectionProps {
  children: React.ReactNode;
  className?: string;
  background?: "white" | "muted";
  id?: string;
}

export default function Section({
  children,
  className = "",
  background = "white",
  id,
}: SectionProps) {
  const backgrounds = {
    white: "bg-white",
    muted: "bg-muted",
  };

  return (
    <section
      id={id}
      className={`py-20 lg:py-28 ${backgrounds[background]} ${className}`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">{children}</div>
    </section>
  );
}
