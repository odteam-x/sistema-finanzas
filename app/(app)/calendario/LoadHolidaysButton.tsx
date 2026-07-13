"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { loadHolidays } from "./actions";

export function LoadHolidaysButton({ year }: { year: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() => startTransition(() => loadHolidays(year).then(() => {}))}
    >
      <Icon name="plus" size={16} />
      Cargar feriados {year}
    </Button>
  );
}
