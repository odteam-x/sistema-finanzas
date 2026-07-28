"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <Card raised className="max-w-md w-full text-center">
        <span className="grid place-items-center size-12 rounded-tile bg-tint-expense text-danger mx-auto mb-3">
          <Icon name="alert" size={26} />
        </span>
        <h1 className="text-xl font-extrabold text-ink">Algo salió mal</h1>
        <p className="text-sm text-muted mt-1 mb-5">
          No pudimos cargar esta sección. Intenta de nuevo.
        </p>
        <Button onClick={reset} full>
          Reintentar
        </Button>
      </Card>
    </div>
  );
}
