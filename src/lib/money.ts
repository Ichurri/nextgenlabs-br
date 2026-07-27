/**
 * Redondea a 2 decimales. Único helper de dinero del repo: todo cálculo
 * monetario pasa por acá, nunca se encadenan floats sin redondear.
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
