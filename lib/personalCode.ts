// Reglas del código personal. Módulo puro a propósito: lo importan el
// formulario (cliente) y las Server Actions (servidor), así que no puede
// arrastrar `server-only` ni criptografía — eso vive en personalCodeCrypto.ts.

/** Seis dígitos exactos. Antes el bloqueo local aceptaba de 4 a 6, un rango
 *  que solo servía para que cada quien eligiera distinto; como segundo factor
 *  real conviene un largo fijo, y el formulario de 6 casillas lo hace obvio. */
export const PERSONAL_CODE_LENGTH = 6;

export function isValidPersonalCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/** Deja solo dígitos y recorta al largo del código. Se usa al teclear, para
 *  que pegar "123 456" o un SMS con texto alrededor no rompa el campo. */
export function sanitizePersonalCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PERSONAL_CODE_LENGTH);
}

/** El mensaje es uno solo y vive acá para que el cliente y el servidor digan
 *  exactamente lo mismo — si divergen, el usuario ve un error distinto según
 *  dónde se haya validado, sin haber hecho nada diferente. */
export const PERSONAL_CODE_ERROR = "El código personal debe tener 6 dígitos.";
