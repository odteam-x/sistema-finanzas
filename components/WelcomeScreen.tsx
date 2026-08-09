"use client";

import Image from "next/image";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { markWelcomeSeen } from "@/app/(app)/onboarding-actions";

/**
 * Una sola pantalla antes del primer Inicio. UNA, no un carrusel de cinco.
 *
 * El Inicio recién creado está vacío por definición: sin cuentas, sin gastos,
 * todo en cero. Caer ahí de golpe no explica nada — y un carrusel de cinco
 * láminas tampoco, porque se pasa sin leer para llegar a la app.
 *
 * Aquí solo se dice qué hace la app en una línea y se entra. Lo que hay que
 * hacer lo enseñan los primeros pasos, en su sitio y cuando toca.
 *
 * Se muestra una vez por usuario (`user_profile.welcome_seen`, v33). En la
 * cuenta y no en localStorage: desde la Fase 27 el almacenamiento local se
 * limpia al cerrar sesión, así que ahí volvería a salir en cada entrada.
 */
export function WelcomeScreen({ nombre }: { nombre?: string }) {
  const [pendiente, startTransition] = useTransition();

  function empezar() {
    startTransition(() => {
      void markWelcomeSeen();
    });
  }

  return (
    <div className="fixed inset-0 z-[120] bg-gradient-brand flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/icons/logo-mark-white.png"
        alt=""
        width={96}
        height={96}
        priority
        className="mb-6"
      />

      <h1 className="text-2xl font-extrabold text-on-brand">
        {nombre ? `Hola, ${nombre}` : "Hola"}
      </h1>

      {/* Una línea. Si hiciera falta un párrafo para explicar qué hace la app,
          el problema no se arregla en esta pantalla. */}
      <p className="text-base text-on-brand-muted mt-2 max-w-xs">
        Cachin&apos; lleva la cuenta de tu dinero entre quincena y quincena: lo
        que entra, lo que sale y lo que te queda.
      </p>

      <div className="mt-8 w-full max-w-xs">
        <Button onClick={empezar} loading={pendiente} full>
          Empezar
        </Button>
      </div>
    </div>
  );
}
