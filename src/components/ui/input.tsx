import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"input"> & { label: string; error?: string };

/** Champ avec label et message d'erreur reliés pour les lecteurs d'écran. */
export function Input({ label, error, className, id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "rounded-control border-line bg-surface placeholder:text-muted aria-[invalid=true]:border-danger min-h-10 border px-3 text-base",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
