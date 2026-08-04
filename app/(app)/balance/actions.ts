"use server";

import { revalidateEverything } from "@/lib/revalidate";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultAccountId } from "@/lib/accounts";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { softDeleteRows, type UndoableResult } from "@/lib/softDelete";
import { todayISO } from "@/lib/format";
import type { AccountType, Currency, MovementKind, MovementSource } from "@/lib/types";

const ACCOUNT_TYPE_VALUES: AccountType[] = [
  "ahorro",
  "banco",
  "efectivo",
  "tarjeta_credito",
  "tarjeta_debito",
];
const CURRENCY_VALUES: Currency[] = ["DOP", "USD", "EUR"];

function parseAccountType(value: FormDataEntryValue | null): AccountType {
  const v = String(value ?? "");
  return (ACCOUNT_TYPE_VALUES as string[]).includes(v) ? (v as AccountType) : "ahorro";
}

function parseCurrency(value: FormDataEntryValue | null): Currency {
  const v = String(value ?? "");
  return (CURRENCY_VALUES as string[]).includes(v) ? (v as Currency) : "DOP";
}


/** De dónde sale el saldo inicial de una cuenta nueva.
 *  'transfer'  → ese dinero ya estaba en otra cuenta tuya: es una MOVIDA.
 *  'new_money' → efectivo suelto, regalo o corrección: entra al sistema.
 *  Antes no se preguntaba y siempre entraba como depósito puro: quien tenía
 *  RD$4,170 en efectivo y abría una cuenta de ahorro con RD$1,000 de saldo
 *  inicial veía su total subir a RD$5,170 — mil pesos que nunca existieron. */
type InitialSource = "transfer" | "new_money";

export async function addAccount(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = parseAccountType(formData.get("type"));
  const currency = parseCurrency(formData.get("currency"));
  const initial = parseAmount(formData.get("initial_amount"));
  const goal_id = String(formData.get("goal_id") ?? "") || null;
  const rawSource = String(formData.get("initial_source") ?? "");
  const fromAccountId = String(formData.get("initial_from_account_id") ?? "") || null;
  if (!name) return { ok: false, error: "Escribe un nombre para la cuenta." };

  const hasInitial = Number.isFinite(initial) && initial > 0;
  const initialSource: InitialSource | null =
    rawSource === "transfer" || rawSource === "new_money" ? rawSource : null;

  const supabase = await createClient();

  // Todo lo que puede fallar se valida ANTES de insertar la cuenta: si el
  // movimiento se rechazara después, quedaría una cuenta vacía que el usuario
  // no pidió y que igual habría que deshacer.
  if (hasInitial) {
    if (!initialSource) {
      return {
        ok: false,
        error:
          "Elige de dónde viene el saldo inicial: si ya lo tenías en otra cuenta tuya, o si es dinero que no estaba registrado.",
      };
    }
    if (initialSource === "transfer") {
      if (!fromAccountId) {
        return { ok: false, error: "Elige la cuenta de donde sale ese dinero." };
      }
      // Mismo motivo que en addTransfer(): una transferencia es UNA fila con
      // UN monto para las dos cuentas — si fueran de monedas distintas ese
      // monto significaría cosas diferentes en cada lado.
      const { data: from } = await supabase
        .from("savings_accounts")
        .select("id, currency")
        .eq("id", fromAccountId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!from) return { ok: false, error: "No se encontró la cuenta de origen." };
      if (from.currency !== currency) {
        return {
          ok: false,
          error: "Ambas cuentas deben ser de la misma moneda para transferir entre ellas.",
        };
      }
    }
  }

  const { data: account, error } = await supabase
    .from("savings_accounts")
    .insert({ user_id: user.id, name, type, goal_id, currency })
    .select("id")
    .single();
  if (error || !account) return { ok: false, error: "No se pudo crear la cuenta." };

  if (hasInitial) {
    const { error: movErr } = await supabase.from("savings_movements").insert(
      initialSource === "transfer"
        ? {
            // Idéntico a addTransfer(): sale de la cuenta origen y entra a la
            // nueva, así el "Total en cuentas" no cambia — solo se redistribuye.
            account_id: fromAccountId,
            to_account_id: account.id,
            user_id: user.id,
            kind: "transferencia",
            amount: initial,
            date: todayISO(),
            note: `Saldo inicial de ${name}`,
            source: "manual",
          }
        : {
            account_id: account.id,
            user_id: user.id,
            kind: "deposito",
            amount: initial,
            date: todayISO(),
            note: "Saldo inicial (dinero que no estaba registrado)",
            source: "manual",
          },
    );
    // Espejo-o-nada: el error del insert antes NI SE MIRABA. Si el movimiento
    // no entra, la cuenta recién creada se deshace — una cuenta creada "con
    // saldo" que en realidad quedó en cero es peor que no crearla, porque el
    // usuario la ve y da por hecho que el dinero está ahí. Borrado duro, no
    // suave: la fila nació hace un instante y no tiene nada que conservar.
    if (movErr) {
      await supabase.from("savings_accounts").delete().eq("id", account.id);
      return {
        ok: false,
        error: "No se pudo registrar el saldo inicial, así que la cuenta no se creó.",
      };
    }
  }

  revalidateEverything();
  return { ok: true };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = parseAccountType(formData.get("type"));
  const goal_id = String(formData.get("goal_id") ?? "") || null;
  const is_cushion = formData.get("is_cushion") === "on";
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };

  const supabase = await createClient();

  let cushion_payout_amount: number | null = null;
  let cushion_target_account_id: string | null = null;
  if (is_cushion) {
    cushion_payout_amount = parseAmount(formData.get("cushion_payout_amount"));
    cushion_target_account_id = String(formData.get("cushion_target_account_id") ?? "") || null;
    if (!Number.isFinite(cushion_payout_amount) || cushion_payout_amount <= 0) {
      return { ok: false, error: "Ingresa el monto fijo que te pagas cada quincena." };
    }
    if (!cushion_target_account_id) {
      return { ok: false, error: "Elige a qué cuenta se paga." };
    }
    if (cushion_target_account_id === id) {
      return { ok: false, error: "La cuenta destino debe ser distinta de la cuenta colchón." };
    }
    // Solo una cuenta colchón por usuario (también lo garantiza el índice
    // único de la base) — se desmarca cualquier otra antes de marcar esta,
    // para no chocar con esa restricción en el camino feliz.
    await supabase
      .from("savings_accounts")
      .update({ is_cushion: false, cushion_payout_amount: null, cushion_target_account_id: null })
      .eq("user_id", user.id)
      .eq("is_cushion", true)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("savings_accounts")
    .update({
      name,
      type,
      goal_id,
      is_cushion,
      cushion_payout_amount: is_cushion ? cushion_payout_amount : null,
      cushion_target_account_id: is_cushion ? cushion_target_account_id : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateEverything();
  return { ok: true };
}

/** "Pagarme esta quincena": transfiere el monto fijo ya configurado desde la
 *  cuenta colchón hacia su cuenta destino — una transferencia común (ver
 *  addTransfer más abajo), solo que el monto y el destino ya están
 *  decididos de antemano, así que es un solo tap sin formulario. */
export async function payCushionQuincena(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: cushion } = await supabase
    .from("savings_accounts")
    .select("id, currency, cushion_payout_amount, cushion_target_account_id")
    .eq("user_id", user.id)
    .eq("is_cushion", true)
    .maybeSingle();
  if (!cushion || !cushion.cushion_payout_amount || !cushion.cushion_target_account_id) {
    return { ok: false, error: "Configura el monto y la cuenta destino primero (Editar cuenta)." };
  }

  const { data: target } = await supabase
    .from("savings_accounts")
    .select("currency")
    .eq("id", cushion.cushion_target_account_id)
    .maybeSingle();
  if (target && target.currency !== cushion.currency) {
    return { ok: false, error: "La cuenta colchón y la de destino ya no comparten moneda." };
  }

  const { error } = await supabase.from("savings_movements").insert({
    account_id: cushion.id,
    to_account_id: cushion.cushion_target_account_id,
    user_id: user.id,
    kind: "transferencia",
    amount: cushion.cushion_payout_amount,
    date: todayISO(),
    note: "Pago de quincena (cuenta colchón)",
    source: "manual",
  });
  if (error) return { ok: false, error: "No se pudo registrar la transferencia." };
  revalidateEverything();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Desde migration-v9, expenses.account_id y salaries.account_id son NOT NULL
  // con FK RESTRICT: la base impide borrar una cuenta que todavía tenga
  // gastos o ingresos colgando. Se reasignan a la cuenta por defecto para no
  // perder ese historial (con CASCADE se borrarían los gastos junto con la
  // cuenta, que no es lo que nadie espera al eliminar una cuenta).
  const fallbackId = await getOrCreateDefaultAccountId(supabase, user.id);
  if (!fallbackId) {
    return { ok: false, error: "No se pudo determinar una cuenta de respaldo." };
  }
  if (fallbackId === id) {
    return {
      ok: false,
      error: "Es tu única cuenta o la cuenta por defecto. Crea otra antes de eliminarla.",
    };
  }

  // Transferencias donde ESTA cuenta era el ORIGEN: a diferencia de
  // to_account_id (FK RESTRICT, se reasigna abajo), account_id tiene ON
  // DELETE CASCADE — dejarlas pasar borraría la fila de transferencia
  // COMPLETA junto con la cuenta, perdiendo el registro de que la cuenta
  // destino (que sigue existiendo) recibió ese dinero. No hay forma segura
  // de reasignar a mano "de dónde salió" ese dinero una vez la cuenta
  // desaparece, así que se bloquea el borrado en vez de adivinar.
  const { count: outgoingTransfers } = await supabase
    .from("savings_movements")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id)
    .eq("kind", "transferencia")
    .is("deleted_at", null);
  if (outgoingTransfers && outgoingTransfers > 0) {
    return {
      ok: false,
      error:
        "Esta cuenta tiene transferencias enviadas a otras cuentas. Elimina esas transferencias primero (en Movimientos) para poder borrar esta cuenta.",
    };
  }

  await Promise.all([
    supabase.from("expenses").update({ account_id: fallbackId }).eq("account_id", id),
    supabase.from("salaries").update({ account_id: fallbackId }).eq("account_id", id),
    // Transferencias que APUNTABAN a esta cuenta como destino: también
    // bloquean el borrado (FK RESTRICT en to_account_id).
    supabase.from("savings_movements").update({ to_account_id: fallbackId }).eq("to_account_id", id),
  ]);

  // Los savings_movements de la propia cuenta sí caen por CASCADE — es
  // correcto: son el saldo de esa cuenta, no historial reutilizable (y ya
  // no puede haber transferencias salientes colgando, bloqueadas arriba).
  const { error } = await supabase.from("savings_accounts").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la cuenta." };
  revalidateEverything();
  return { ok: true };
}

/** Transferencia entre dos cuentas propias: UNA fila la representa entera
 *  (sale de account_id, entra a to_account_id). No cuenta como ingreso ni
 *  como gasto — el dinero no entró ni salió del sistema, solo cambió de
 *  bolsillo. Ver lib/balances.ts y la vista v_account_balances. */
export async function addTransfer(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const from_account_id = String(formData.get("from_account_id") ?? "");
  const to_account_id = String(formData.get("to_account_id") ?? "");
  const amount = parseAmount(formData.get("amount"));
  const date = String(formData.get("date") ?? "") || todayISO();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!from_account_id || !to_account_id) {
    return { ok: false, error: "Elige la cuenta de origen y la de destino." };
  }
  if (from_account_id === to_account_id) {
    return { ok: false, error: "Elige dos cuentas distintas." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }

  const supabase = await createClient();

  // Una transferencia es UNA fila con UN monto para las dos cuentas — si
  // fueran de monedas distintas, ese monto significaría cosas diferentes en
  // cada lado (¿500 qué?). Hasta que haya conversión automática acá, se
  // exige que ambas cuentas compartan moneda.
  const { data: pair } = await supabase
    .from("savings_accounts")
    .select("id, currency")
    .in("id", [from_account_id, to_account_id]);
  const fromCur = pair?.find((a) => a.id === from_account_id)?.currency;
  const toCur = pair?.find((a) => a.id === to_account_id)?.currency;
  if (fromCur && toCur && fromCur !== toCur) {
    return { ok: false, error: "Ambas cuentas deben ser de la misma moneda para transferir entre ellas." };
  }

  const { error } = await supabase.from("savings_movements").insert({
    account_id: from_account_id,
    to_account_id,
    user_id: user.id,
    kind: "transferencia",
    amount,
    date,
    note,
    source: "manual",
  });
  if (error) return { ok: false, error: "No se pudo registrar la transferencia." };
  revalidateEverything();
  return { ok: true };
}

export async function addMovement(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const account_id = String(formData.get("account_id") ?? "");
  const kind = String(formData.get("kind") ?? "deposito") as MovementKind;
  const amount = parseAmount(formData.get("amount"));
  const date = String(formData.get("date") ?? "") || todayISO();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!account_id) return { ok: false, error: "Cuenta no válida." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("savings_movements").insert({
    account_id,
    user_id: user.id,
    kind: kind === "retiro" ? "retiro" : "deposito",
    amount,
    date,
    note,
  });
  if (error) return { ok: false, error: "No se pudo registrar el movimiento." };
  revalidateEverything();
  return { ok: true };
}

/** De dónde vino un movimiento que NO se puede borrar suelto, y adónde hay
 *  que ir a borrar el original. El texto se le enseña al usuario tal cual.
 *
 *  `manual` está en la lista y no es contradictorio: el espejo de un gasto
 *  corriente se guarda con source='manual' y el id del gasto en
 *  source_ref_id. Es el caso MÁS común con diferencia, así que merece su
 *  propio texto en vez de caer en el genérico. Lo que distingue a un
 *  movimiento suelto no es el source, es no tener source_ref_id. */
const ORIGEN_DEL_MOVIMIENTO: Partial<Record<MovementSource, string>> = {
  manual: "un gasto registrado — elimina el gasto desde Movimientos o Presupuesto",
  salary: "un ingreso registrado — elimínalo desde Ingresos",
  subscription: "un cobro de suscripción — elimina el gasto desde Movimientos",
  debt_payment: "el pago de una deuda — deshazlo desde Deudas",
  goal_contribution: "un aporte a una meta — deshazlo desde Ahorros",
  receivable_collected: "el cobro de un préstamo — deshazlo desde Cobros",
  debt_disbursement: "el dinero que recibiste de una deuda — elimina la deuda desde Deudas",
  receivable_disbursement: "el dinero que prestaste — elimina el préstamo desde Cobros",
};

export async function deleteMovement(id: string): Promise<UndoableResult> {
  await requireUser();
  const supabase = await createClient();

  /* Un movimiento espejo NO se puede borrar solo. Si se borra el espejo de un
     gasto, el gasto sigue vivo pero su dinero vuelve a la cuenta: el saldo
     sube y el gasto se sigue contando como gastado. Es exactamente la
     invariante que vigila check:coherence ("todo gasto vivo tiene UN espejo"),
     y romperla desde la UI descuadra el ledger, que es la fuente de verdad.

     La comprobación va acá y no solo en la pantalla porque una acción de
     servidor es un endpoint público: esconder el botón evita el accidente,
     no el caso de que la acción se invoque igual. /movimientos ya escondía el
     botón; /balance lo mostraba en TODOS los movimientos, y por ahí sí se
     llegaba. Ahora ambas cosas están cubiertas. */
  const { data: movement, error: readError } = await supabase
    .from("savings_movements")
    .select("source, source_ref_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) return { ok: false, error: "No se pudo eliminar." };
  if (!movement) return { ok: false, error: "Ese movimiento ya no existe." };

  const esEspejo = movement.source !== "manual" || movement.source_ref_id !== null;
  if (esEspejo) {
    const origen = ORIGEN_DEL_MOVIMIENTO[movement.source as MovementSource];
    return {
      ok: false,
      error: origen
        ? `Este movimiento viene de ${origen}. Si lo borras solo, el saldo dejaría de cuadrar.`
        : "Este movimiento viene de otro registro y no se puede borrar suelto.",
    };
  }

  // R15: borrado suave — la fila se marca, no se destruye, para que
  // "Deshacer" sea instantáneo y no haya que reconstruir nada.
  const res = await softDeleteRows("savings_movements", [id]);
  if (!res.ok) return { ok: false, error: "No se pudo eliminar." };
  revalidateEverything();
  return { ok: true, undo: res.undo };
}
