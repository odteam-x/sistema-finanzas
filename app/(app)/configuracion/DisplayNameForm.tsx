"use client";

import { useState, useTransition } from "react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { writeProfile } from "@/lib/profile";
import { saveDisplayName } from "./actions";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      const formData = new FormData(e.currentTarget);
      const res = await saveDisplayName(formData);
      if (res.ok) {
        writeProfile({ displayName: name });
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="Tu nombre" htmlFor="display_name" hint="Se usa en el saludo del Inicio.">
        <Input
          id="display_name"
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="¿Cómo te llamas?"
          maxLength={40}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending} size="sm">
          Guardar
        </Button>
        {saved && !pending && <span className="text-xs text-primary font-semibold">Guardado.</span>}
      </div>
    </form>
  );
}
