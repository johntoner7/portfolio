import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

/**
 * The one pill-shaped control on the site. `solid` is the single filled call to
 * action per section; `outline` is everything else. Use `buttonClass` directly
 * when the element is neither a <button> nor an <a>.
 */
type ButtonVariant = "solid" | "outline" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  solid: "border-transparent bg-ocean text-page hover:bg-ocean/85",
  outline: "border-divider bg-transparent text-ink hover:border-ocean hover:bg-ocean/10",
  // outline, but already leaning towards the accent: a suggested option
  accent: "border-ocean/40 bg-ocean/5 text-ink hover:border-ocean hover:bg-ocean/10",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

export function buttonClass(variant: ButtonVariant = "outline", size: ButtonSize = "md", className = "") {
  return [
    "inline-flex items-center gap-2 rounded-full border font-semibold transition-colors outline-none",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].join(" ");
}

type Styling = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Styling) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

/** Opens off-site links in a new tab; same-site ones navigate normally. */
export function ButtonLink({ variant, size, className, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & Styling) {
  const external = href?.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}
