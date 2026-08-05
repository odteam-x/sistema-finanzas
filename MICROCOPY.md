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
