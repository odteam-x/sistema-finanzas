// Entorno de prueba: un usuario aparte para poder ver la app POR DENTRO.
//
// EL PROBLEMA QUE RESUELVE. Todo lo que vive detrás del login se venía
// verificando por tipos y por construcción, nunca renderizado, porque entrar
// con la cuenta real exige escribir una contraseña — y eso no se hace.
//
// LA SALIDA. Un usuario de prueba propio y un enlace mágico. La clave
// service_role puede acuñar un enlace de un solo uso que abre sesión sin que
// nadie teclee nada. El usuario de prueba tiene contraseña, sí, pero es
// aleatoria, no se imprime y no se usa: existe solo porque el registro la pide.
//
// AISLAMIENTO. Comparte proyecto de Supabase con la cuenta real, así que
// comparte ESQUEMA — que es justo lo que se quiere probar — pero no datos: RLS
// separa por user_id y toda la app filtra por el usuario de la sesión. Lo que
// se cree aquí no aparece en la cuenta real, y al revés tampoco.
//
// LIMPIEZA. `borrar` elimina el usuario de auth, y todas las tablas cuelgan de
// `references auth.users (id) on delete cascade`, así que se va todo con él.
//
// Uso:
//   node scripts/test-env.mjs crear     Crea el usuario (idempotente)
//   node scripts/test-env.mjs enlace    Acuña un enlace nuevo de un solo uso
//   node scripts/test-env.mjs borrar    Borra el usuario y todos sus datos
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

// Se lee .env.local a mano: este guion se corre con `node`, fuera de Next, que
// es quien normalmente carga ese archivo.
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const URL_SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SUPABASE || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// El "+prueba" hace evidente de un vistazo, en el panel de Supabase, que esta
// cuenta no es de nadie. El dominio example.com no existe y nunca va a recibir
// correo, que es lo que se quiere: el enlace se acuña por API, no por email.
const CORREO = "cachin+prueba@example.com";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const admin = createClient(URL_SUPABASE, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function buscarUsuario() {
  // listUsers pagina; con una base de un solo usuario real la primera página
  // sobra, pero se filtra igual por si acaso.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === CORREO) ?? null;
}

async function crear() {
  const existente = await buscarUsuario();
  if (existente) {
    console.log("Ya existe: " + CORREO + " (" + existente.id + ")");
    return existente;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: CORREO,
    // Aleatoria y descartada al momento. No se imprime ni se guarda: la sesión
    // se abre siempre por enlace mágico.
    password: randomBytes(24).toString("base64url"),
    // Sin esto el usuario queda pendiente de confirmar y el enlace no entra.
    email_confirm: true,
  });
  if (error) throw error;
  console.log("Creado: " + CORREO + " (" + data.user.id + ")");
  console.log("La app se encarga del resto: las cuentas, deudas y gastos de");
  console.log("prueba se crean desde la interfaz, que es lo que hay que probar.");
  return data.user;
}

async function enlace() {
  if (!(await buscarUsuario())) await crear();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: CORREO,
    options: { redirectTo: BASE + "/auth/callback" },
  });
  if (error) throw error;
  console.log(data.properties.action_link);
}

async function borrar() {
  const u = await buscarUsuario();
  if (!u) {
    console.log("No existe " + CORREO + ", nada que borrar.");
    return;
  }
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) throw error;
  // Todas las tablas cuelgan de auth.users con on delete cascade, así que sus
  // cuentas, movimientos, deudas y gastos se van con él. No queda nada suelto.
  console.log("Borrado " + CORREO + " y todos sus datos.");
}

// `enlace` devuelve la URL de Supabase, que redirige al navegador con los
// tokens en el FRAGMENTO (#access_token=...) — y un fragmento no viaja al
// servidor, así que la sesión nunca llega a cuajar. Además el navegador
// integrado no sale de localhost sin aprobación.
//
// `entrar` se salta las dos cosas: `generateLink` ya devuelve el `hashed_token`
// suelto, así que se arma directamente la URL local que el callback entiende.
// Un solo salto, todo en localhost, y el token sigue siendo de un solo uso.
async function entrar() {
  if (!(await buscarUsuario())) await crear();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: CORREO,
    options: { redirectTo: BASE + "/auth/callback" },
  });
  if (error) throw error;
  console.log(
    BASE +
      "/auth/callback?token_hash=" +
      encodeURIComponent(data.properties.hashed_token) +
      "&type=magiclink",
  );
}

const cmd = process.argv[2];
const acciones = { crear, entrar, enlace, borrar };
if (!acciones[cmd]) {
  console.error("Uso: node scripts/test-env.mjs crear|entrar|enlace|borrar");
  process.exit(1);
}
await acciones[cmd]();
