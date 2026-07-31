interface PageHeroProps {
  title: string;
  description?: string;
  backgroundImage?: string;
}

export default function PageHero({
  title,
  description,
  backgroundImage,
}: PageHeroProps) {
  return (
    <section
      className="relative pt-52 pb-20 lg:pt-60 lg:pb-28 bg-muted"
      style={
        backgroundImage
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1
            className={`font-serif text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl ${
              backgroundImage ? "text-white" : "text-foreground"
            }`}
          >
            {title}
          </h1>
          {description && (
            <p
              className={`mt-6 text-lg leading-relaxed ${
                backgroundImage ? "text-white/90" : "text-muted-foreground"
              }`}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
