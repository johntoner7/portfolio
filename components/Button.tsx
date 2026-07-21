import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "muted" | "tertiary";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-ocean/40 bg-ocean/5 text-ink hover:border-ocean hover:bg-ocean/10",
  secondary:
    "border-divider bg-page/60 text-ink hover:border-ocean hover:bg-ocean/10",
  muted:
    "border-divider bg-page/70 text-ink hover:border-ocean hover:bg-ocean/10",
  tertiary:
    "border-divider bg-surface text-muted hover:border-ocean hover:text-ink",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "secondary",
  size = "sm",
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center gap-2 rounded-full border font-medium transition-colors outline-none";
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <button
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    />
  );
}
