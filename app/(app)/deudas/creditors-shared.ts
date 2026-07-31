// Constante compartida entre el formulario (cliente) y la action (servidor).
// Va en su propio módulo porque actions.ts es "use server": desde ahí solo se
// pueden exportar funciones async, nunca un valor suelto.

/** Valor del selector de acreedor que significa "ninguno de estos, voy a
 *  escribir uno nuevo". No puede ser "" — Radix Select usa la cadena vacía
 *  internamente para "sin selección" (ver components/ui/Field.tsx). */
export const NEW_CREDITOR = "__new__";
