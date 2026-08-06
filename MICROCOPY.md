# Microcopy — Cachin'

Reglas de escritura de la interfaz. Son parte del diseño, no decoración: en un
mercado con una brecha reconocida de educación financiera, el texto que explica
es la ventaja del producto, no un relleno.

---

## Botones: verbo + objeto

Un botón debe decir qué hace **sin que haya que recordar el contexto**. Si al
leerlo aislado no se sabe qué pasa, falla.

| ❌ | ✅ |
|---|---|
| Guardar | Guardar categoría |
| Enviar | Registrar gasto |
| Agregar | Agregar etiqueta |
| OK | Entendido |
| Aceptar | Eliminar deuda |

La excepción son los verbos que ya traen su objeto implícito y no se confunden
con nada más en su pantalla: **Transferir**, **Depositar**, **Retirar**,
**Entrar**.

## Errores: qué pasó y qué hacer

Nunca un código técnico, nunca "Error" a secas, nunca una disculpa.

| ❌ | ✅ |
|---|---|
| Error | No se pudo eliminar el gasto. Vuelve a intentarlo. |
| Error 23505 | Ya tienes otra etiqueta con ese nombre. |
| Algo salió mal | Esta meta está vinculada a una cuenta — aporta desde Balance. |

El error va **debajo del campo** que lo causó, no en un aviso genérico arriba
del formulario.

## Confirmaciones destructivas: nombrar lo que se borra

| ❌ | ✅ |
|---|---|
| ¿Estás seguro? | ¿Eliminar la deuda de Mami? |
| ¿Eliminar? | ¿Eliminar la etiqueta Comida? |

El mensaje de apoyo dice la **consecuencia real**, no repite la pregunta:
"Los gastos que la usaban quedarán sin etiqueta."

## Sin jerga sin explicar

Cada término técnico lleva su explicación en lenguaje llano, con el botón `?`
(`InfoTooltip`) o en la línea de apoyo. Términos que **siempre** se explican:
quincena, cuota, saldo estimado, promedio por día, ahorro sin meta asignada.

## Tono

- **Tuteo**, directo. Nada de "usted", nada de "por favor".
- **Sin signos de admiración**, con una única excepción en toda la app: la
  pantalla de logro al completar una meta.
- Sin humor sobre el dinero del usuario. Deber dinero no es gracioso.
- **Deudas se escribe en calma.** Nada de racha, logro ni comparaciones con
  tono positivo forzado — eso vive solo en Ahorros.

## Cifras

- Siempre con **`RD$`** y separador de miles: `RD$12,500`.
- Sin decimales cuando son cero y la cifra es de resumen; con decimales en el
  detalle de un movimiento.
- Los montos van **alineados a la derecha** en filas de lista, en tabular.

## Registro dominicano

El español de la app es **dominicano neutro**: el de alguien que te explica sus
cuentas en la mesa, no el de un banco ni el de un manual traducido.

Lo que eso significa en concreto:

- **La quincena es la unidad de tiempo**, no el mes. La app ya lo hace en 61
  sitios: se cobra el 5 y el 20, o el 15 y el 30, y el dinero se piensa de
  cobro a cobro. Escribir "este mes" donde el usuario piensa "esta quincena"
  suena a producto importado.
- **Referencias cotidianas reales, no ejemplos de folleto.** "Colmado" antes
  que "supermercado"; "Mami" antes que "Familiar 1". Los ejemplos salen de la
  vida de aquí.
- **`RD$` siempre, sin excepción.** Nunca `$` a secas: en un país donde el
  dólar circula, un peso sin bandera es una cifra ambigua.
- **Nada de anglicismos evitables**: presupuesto, no *budget*; cuota, no
  *installment*; ahorro, no *savings*.

Lo que este registro **no** es: no es jerga. "Cuartos", "chelito" o "un palo"
son de conversación, no de una pantalla donde alguien decide si le alcanza
hasta el 20. Cercano no es informal.

## Peso: cada aviso al tamaño de su consecuencia

Un texto que grita cuando no hace falta enseña a no leer los que sí importan.

| Situación | Cómo se escribe |
|---|---|
| Reversible (hay "Deshacer") | Normal, sin alarma. El botón va en primario. |
| Definitivo | "Esto no se puede deshacer", con todas las letras, en rojo. |
| Vencido | Rojo. Ya pasó, no hay margen. |
| En 3 días o menos | Ámbar. Todavía se puede mover dinero para llegar. |
| Más allá | Gris. Es contexto, no un aviso. |

Los tres días no son un número redondo: entre quincena y quincena hay quince,
así que tres es el margen en que aún cabe reaccionar **sin haber cobrado**.

## Lo hecho no se repite

Un paso terminado deja de ocupar sitio. En Inicio, los primeros pasos ya
cumplidos se cuentan en una línea ("2 de 3 listos") en vez de conservar cada
uno su fila con título y explicación — medido: la tarjeta pasaba de 477px a
231px, en una pantalla de 2300.

La regla general: **el Inicio es para ver cómo estás, no para felicitarte por
haber terminado de configurar.**

## Colapsar es decir cuánto hay

Cuando una lista se colapsa, el botón dice **la cantidad**, no solo la acción:

| ❌ | ✅ |
|---|---|
| Ver más | Ver las 12 cuotas |
| Mostrar todo | Ver solo lo pendiente |

Así se sabe qué hay debajo antes de abrirlo, y si vale la pena el toque.
