"use client";

import { Children, isValidElement, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const baseControl =
  "w-full min-h-11 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] px-3.5 " +
  "text-ink placeholder:text-muted/60 shadow-inner " +
  "focus:outline-none focus:border-primary focus:bg-[var(--input-bg-focus)] transition-colors";

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

// Radix Select.Item no acepta value="" (lo usa internamente para "sin
// selección") — pero medio sitio depende de <option value="">General</option>
// como forma de "sin categoría/cuenta/etc.". Se mapea a un centinela interno
// y se traduce de vuelta al enviar el formulario, para no tener que tocar
// ningún sitio que ya usa <Select><option value="">...</option>...</Select>.
const EMPTY = "__empty__";
const toSentinel = (v: string) => (v === "" ? EMPTY : v);
const fromSentinel = (v: string) => (v === EMPTY ? "" : v);

interface OptionItem {
  sentinel: string;
  real: string;
  label: React.ReactNode;
  disabled?: boolean;
}

function extractOptions(children: React.ReactNode): OptionItem[] {
  const items: OptionItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as {
      value?: string;
      children?: React.ReactNode;
      disabled?: boolean;
    };
    const real = props.value ?? "";
    items.push({ sentinel: toSentinel(real), real, label: props.children, disabled: props.disabled });
  });
  return items;
}

export function Select({
  className,
  children,
  name,
  id,
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  "aria-label": ariaLabel,
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const options = extractOptions(children);
  const initial = toSentinel(String(value ?? defaultValue ?? options[0]?.real ?? ""));
  const [internal, setInternal] = useState(initial);
  const current = value !== undefined ? toSentinel(String(value)) : internal;

  function handleChange(next: string) {
    setInternal(next);
    if (onChange) {
      const real = fromSentinel(next);
      onChange({
        target: { value: real, name },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    }
  }

  return (
    <SelectPrimitive.Root
      value={current}
      onValueChange={handleChange}
      disabled={disabled}
      required={required}
    >
      <input type="hidden" name={name} value={fromSentinel(current)} />
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          baseControl,
          "flex items-center justify-between gap-2 cursor-pointer data-[placeholder]:text-muted/60",
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="shrink-0 text-muted">
          <Icon name="chevronDown" size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[110] w-[var(--radix-select-trigger-width)] max-h-[var(--radix-select-content-available-height)] overflow-hidden rounded-2xl border border-[var(--input-border)] bg-[var(--glass-bg-modal)] shadow-lg shadow-black/15 backdrop-blur-xl"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.sentinel}
                value={opt.sentinel}
                disabled={opt.disabled}
                className="relative flex items-center rounded-xl px-3 py-2.5 text-sm text-ink cursor-pointer outline-none select-none data-[highlighted]:bg-primary-soft data-[state=checked]:font-semibold"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
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
