import { Link } from "@/i18n/navigation";

interface ButtonProps {
  href?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
}

function isExternalOrProtocol(href: string) {
  return /^(https?:|mailto:|tel:|viber:|#|\/admin)/.test(href);
}

export default function Button({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
  type = "button",
  onClick,
  disabled = false,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-foreground text-white hover:bg-foreground/90 hover:shadow-lg",
    secondary: "bg-muted text-foreground hover:bg-border",
    outline:
      "border border-foreground text-foreground hover:bg-foreground hover:text-white",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const combinedStyles = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    if (isExternalOrProtocol(href)) {
      return (
        <a href={href} className={combinedStyles}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={combinedStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedStyles}
    >
      {children}
    </button>
  );
}
