"use client";

import { useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <GlassCard strong className="max-w-lg w-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="grid place-items-center size-11 rounded-2xl bg-danger-soft text-danger">
            <Icon name="alert" size={24} />
          </span>
          <h1 className="text-xl font-extrabold text-ink">Ocurrió un error</h1>
        </div>
        <p className="text-sm text-muted mb-3">
          Esto es lo que reportó el servidor (te ayuda a diagnosticar):
        </p>
        <pre className="text-xs bg-ink/90 text-cream rounded-2xl p-4 overflow-x-auto mb-4 whitespace-pre-wrap break-words">
          {error.message || "Error sin mensaje"}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <Button onClick={reset} full>
          Reintentar
        </Button>
      </GlassCard>
    </div>
  );
}
