import { GlassCard } from "./ui/GlassCard";
import { Icon } from "./ui/Icon";

/** Se muestra cuando faltan las variables de entorno de Supabase. */
export function SetupNotice() {
  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <GlassCard strong className="max-w-lg w-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="grid place-items-center size-11 rounded-2xl bg-warning-soft text-warning">
            <Icon name="settings" size={24} />
          </span>
          <h1 className="text-xl font-extrabold text-ink">Falta configurar Supabase</h1>
        </div>
        <p className="text-sm text-muted mb-4">
          Para conectar los datos, crea un proyecto gratis en{" "}
          <span className="font-semibold text-ink">supabase.com</span> y agrega tus
          claves en un archivo <code className="px-1 rounded bg-black/5">.env.local</code>:
        </p>
        <pre className="text-xs bg-ink/90 text-cream rounded-2xl p-4 overflow-x-auto mb-4">
{`NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key`}
        </pre>
        <ol className="text-sm text-ink/80 list-decimal list-inside space-y-1">
          <li>Aplica el SQL de <code className="px-1 rounded bg-black/5">supabase/schema.sql</code>.</li>
          <li>Crea tu usuario en Authentication → Users.</li>
          <li>Reinicia el servidor: <code className="px-1 rounded bg-black/5">npm run dev</code>.</li>
        </ol>
        <p className="text-xs text-muted mt-4">
          Encontrarás el paso a paso completo en el <span className="font-semibold">README</span>.
        </p>
      </GlassCard>
    </div>
  );
}
