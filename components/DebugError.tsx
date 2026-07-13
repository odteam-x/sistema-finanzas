// Muestra el error real sin que Next.js lo oculte (temporal, para diagnóstico).
export function DebugError({ error }: { error: unknown }) {
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}`
      : String(error);

  return (
    <div className="min-h-dvh p-5">
      <pre className="text-xs bg-ink text-cream rounded-2xl p-4 overflow-x-auto whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}
