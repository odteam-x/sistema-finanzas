// Configuración compartida de Supabase.
// Si las variables de entorno no están definidas, la app sigue funcionando
// en modo "sin configurar" y muestra instrucciones en lugar de romperse.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
