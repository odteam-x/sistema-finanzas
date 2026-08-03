import { revalidatePath } from "next/cache";

/** Invalida TODAS las rutas de la app tras una mutación.
 *
 *  Antes cada archivo de acciones mantenía su propia lista de rutas a
 *  revalidar, y ninguna estaba completa: registrar un gasto no refrescaba
 *  Reportes ni Ahorros, un movimiento en Balance no refrescaba Deudas ni
 *  Cobros, aportar a una meta no refrescaba Presupuesto. El síntoma era
 *  tener que salir de la sección y volver para ver el número nuevo — al
 *  navegar se descarta la caché del router del cliente y se vuelve a pedir.
 *
 *  Doce listas que había que acordarse de ampliar cada vez que una pantalla
 *  nueva leía algo del ledger. Y el ledger es la ÚNICA fuente de verdad del
 *  balance, así que en la práctica cualquier movimiento de dinero afecta a
 *  casi todas las pantallas: mantener listas finas era optimizar contra la
 *  naturaleza del dato.
 *
 *  `revalidatePath("/", "layout")` invalida el layout raíz y con él todo lo
 *  que cuelga debajo. Cuesta más refetch del necesario en algunos casos, y
 *  se acepta a propósito: un número de dinero desactualizado es un fallo
 *  real, un refetch de más no. */
export function revalidateEverything(): void {
  revalidatePath("/", "layout");
}
