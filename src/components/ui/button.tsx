import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-bg",
  danger: "border border-line bg-surface text-danger hover:bg-bg",
};

type Props = React.ComponentProps<"button"> & { variant?: Variant; isLoading?: boolean };

export function Button({
  variant = "primary",
  className,
  type = "button",
  isLoading = false,
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      data-btn-loading={isLoading ? "true" : undefined}
      className={cn(
        "rounded-control inline-flex min-h-10 items-center justify-center px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading && <span className="page-btn-spinner" />}
      {children}
    </button>
  );
}
