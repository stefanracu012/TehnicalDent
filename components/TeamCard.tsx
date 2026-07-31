import Image from "next/image";

interface TeamCardProps {
  name: string;
  role: string;
  description: string;
  image: string;
}

export default function TeamCard({
  name,
  role,
  description,
  image,
}: TeamCardProps) {
  return (
    <article className="group">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="pt-6">
        <h3 className="font-serif text-xl font-medium text-foreground">
          {name}
        </h3>
        <p className="mt-1 text-sm font-medium text-accent">{role}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </article>
  );
}
