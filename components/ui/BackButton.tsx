"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Volver"
      className="grid place-items-center size-9 -ml-1.5 rounded-pill text-ink hover:bg-surface-sunken cursor-pointer shrink-0 active:scale-[0.97] transition-transform"
    >
      <Icon name="chevronLeft" size={22} />
    </button>
  );
}
