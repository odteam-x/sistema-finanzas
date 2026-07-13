import { cn } from "@/lib/cn";

const baseControl =
  "w-full min-h-11 rounded-2xl bg-white/70 border border-white/70 px-3.5 " +
  "text-ink placeholder:text-muted/60 shadow-inner " +
  "focus:outline-none focus:border-primary focus:bg-white/90 transition-colors";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/** Envoltura de campo: etiqueta visible, texto de ayuda y error. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-ink flex items-center gap-1"
      >
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseControl, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(baseControl, "appearance-none pr-9 cursor-pointer", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(baseControl, "py-2.5 min-h-20 resize-y", className)}
      {...props}
    />
  );
}

/** Campo de monto con prefijo RD$ e inputmode decimal. */
export function MoneyInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
        RD$
      </span>
      <input
        type="text"
        inputMode="decimal"
        className={cn(baseControl, "pl-12 tabular", className)}
        {...props}
      />
    </div>
  );
}
