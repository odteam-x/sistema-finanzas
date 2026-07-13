# Finanzas Personales

Aplicación web **PWA** (instalable en el celular) para controlar tus finanzas
personales como usuario único: sueldo quincenal, calendario laboral, presupuesto
de gastos diarios, metas de ahorro, deudas y un dashboard con resumen y gráficos.

- **Diseño:** glassmorfismo, fondo crema/beige y acento verde. Optimizado para
  móvil (Samsung S22+ y similares) y adaptado a tablet/desktop.
- **Moneda:** peso dominicano (RD$). Todo en español.
- **Actualización automática:** cada dato que registras recalcula al instante el
  dashboard y todas las comparativas.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Auth (email/contraseña) + Postgres con RLS
- PWA con `manifest.json` + service worker
- Gráficos SVG propios (sin librerías pesadas)

## Módulos

1. **Ingresos** — sueldo quincenal configurable, pagos extra e historial.
2. **Calendario laboral** — lunes a sábado laborable, domingo libre, feriados
   dominicanos editables. Alimenta el presupuesto con los días trabajados.
3. **Presupuesto** — montos por día trabajado (pasaje, desayuno, etc.), cálculo
   automático por quincena/mes y comparación con el gasto real.
4. **Metas** — tablero visual con barra de progreso por objetivo.
5. **Ahorros** — cuentas de ahorro (banco, efectivo, alcancía) con depósitos,
   retiros e historial de movimientos.
6. **Deudas** — pago único o en cuotas, vencimientos y estado.
7. **Consejos** — tips de finanzas + alertas según tus datos.
8. **Dashboard** — saldo estimado, próximo pago, próxima deuda, ahorros, metas
   y gráfico de distribución de gastos.

Incluye animaciones fluidas (Framer Motion), skeleton loaders e ilustraciones.

---

## 1. Configurar Supabase

1. Crea una cuenta gratis en [supabase.com](https://supabase.com) y un **nuevo
   proyecto**.
2. Ve a **SQL Editor → New query**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo (crea las tablas, los
   índices y las políticas de seguridad RLS). Este script ya incluye el módulo
   de Ahorros. Si aplicaste una versión anterior del esquema, ejecuta además
   [`supabase/savings.sql`](supabase/savings.sql) para agregar las tablas de
   ahorros.
3. Crea tu usuario en **Authentication → Users → Add user**
   (email + contraseña). Marca "Auto Confirm User".
   - Recomendado: en **Authentication → Providers → Email**, desactiva
     "Enable Sign-ups" para que nadie más pueda registrarse.
4. Copia tus claves en **Project Settings → API**:
   - `Project URL`
   - `anon public` key

## 2. Variables de entorno

Copia el archivo de ejemplo y pega tus claves:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-public-key
```

> Si aún no configuras Supabase, la app se abre igual y muestra las
> instrucciones en pantalla.

## 3. Ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con el
usuario que creaste.

## 4. Instalar como app (PWA)

En el celular, abre la web en Chrome/Safari y elige **"Agregar a pantalla de
inicio"**. Se instala como aplicación independiente.

Los iconos del PWA se generan con:

```bash
node scripts/gen-icons.mjs
```

---

## Deploy en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **New Project** → importa el repo.
3. En **Environment Variables**, agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel detecta Next.js automáticamente.
5. En Supabase → **Authentication → URL Configuration**, agrega tu dominio de
   Vercel a las URLs permitidas.

---

## Estructura del proyecto

```
app/
  (app)/            Rutas protegidas (dashboard, ingresos, calendario, ...)
    layout.tsx      Shell con sidebar (desktop) + tab bar (móvil)
    <módulo>/       page.tsx + actions.ts (Server Actions) por módulo
  login/            Autenticación email + contraseña
components/
  ui/               Sistema de diseño glass (Card, Button, Field, Modal, ...)
  nav/              Navegación (Sidebar, BottomTabBar)
  charts/           Gráficos SVG (dona, barras)
lib/
  supabase/         Clientes (browser, server, proxy) + config
  calendar.ts       Conteo de días trabajados
  periods.ts        Quincenas y próximos pagos
  summary.ts        Resumen financiero central (dashboard + alertas)
  format.ts         Formato RD$ y fechas
  holidays-do.ts    Feriados dominicanos por defecto
supabase/
  schema.sql        Tablas + índices + RLS
proxy.ts            Refresco de sesión y protección de rutas
```

## Scripts

| Comando         | Descripción              |
| --------------- | ------------------------ |
| `npm run dev`   | Servidor de desarrollo   |
| `npm run build` | Build de producción      |
| `npm run start` | Servir el build          |
| `npm run lint`  | Linter                   |

---

Hecho con Next.js + Supabase. Contenido educativo; no constituye asesoría de
inversión personalizada.
