"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Volver"
      className="grid place-items-center size-9 -ml-1.5 rounded-full text-ink hover:bg-black/5 cursor-pointer shrink-0 active:scale-90 transition-transform"
    >
      <Icon name="chevronLeft" size={22} />
    </button>
  );
}
