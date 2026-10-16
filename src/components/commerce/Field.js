import { cn } from "@/lib/utils";

/**
 * Accessible form field. Renders a label, the control (an <input> by default, or `children`),
 * an optional hint and an aria-live error message wired via aria-describedby.
 */
export default function Field({ id, label, error, hint, optional, className, children, prefix, suffix, ...inputProps }) {
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(" ") || undefined;
  const control = children ?? (
    <input
      id={id}
      name={inputProps.name || id}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedBy}
      className={cn("field", prefix && "pl-14", suffix && "pr-12", error && "border-danger/60 focus:border-danger")}
      {...inputProps}
    />
  );
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="label flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {optional && <span className="text-[11px] text-mute">Optional</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-[13px] text-mute" aria-hidden>
            {prefix}
          </span>
        )}
        {control}
        {suffix && <span className="absolute inset-y-0 right-3 flex items-center">{suffix}</span>}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[12px] text-mute">
          {hint}
        </p>
      )}
      <p id={errId} aria-live="polite" className={cn("text-[12px] text-danger", error ? "mt-1.5" : "sr-only")}>
        {error || ""}
      </p>
    </div>
  );
}
