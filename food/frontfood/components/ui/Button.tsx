import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-cta text-white hover:bg-cta-dark shadow-button",
  secondary: "bg-ink-950 text-cream-100 hover:bg-ink-900",
  outline: "border border-ink-950/15 text-ink-950 hover:border-accent hover:text-accent",
  ghost: "text-ink-950 hover:bg-ink-950/5",
  danger: "bg-maroon-600 text-white hover:bg-maroon-700",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-heading font-bold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", loading, fullWidth, className = "", children, ...rest } = props as CommonProps & {
    className?: string;
    href?: string;
  };

  const classes = `${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""} ${className}`;

  if ("href" in props && props.href) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" className={classes} disabled={loading || buttonRest.disabled} {...buttonRest}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
