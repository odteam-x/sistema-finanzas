"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[110] min-w-40 overflow-hidden rounded-tile border border-line-strong",
          "bg-surface-modal p-1 shadow-raised",
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink cursor-pointer outline-none select-none",
        "data-[highlighted]:bg-primary-soft data-[state=checked]:font-semibold",
        className,
      )}
      {...props}
    />
  );
}
