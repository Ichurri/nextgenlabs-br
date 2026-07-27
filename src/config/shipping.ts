/**
 * Configuración de envío nacional.
 * PLACEHOLDER: el cliente debe reemplazar estos valores antes de publicar.
 */
export const SHIPPING = {
  // PLACEHOLDER: el cliente define el costo de envío nacional.
  nationalCost: 30,
  // PLACEHOLDER: null = nunca hay envío gratis. Un número = gratis desde ese subtotal.
  freeOver: null as number | null,
  label: "Envío nacional",
} as const;
