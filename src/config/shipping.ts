/** Configuración de envío. */
export const SHIPPING = {
  nationalCost: 25,
  // El negocio está en Cochabamba: entrega/recojo local sin costo de envío.
  cochabambaCost: 0,
  // null = nunca hay envío gratis. Un número = gratis desde ese subtotal.
  freeOver: null as number | null,
  label: "Envío nacional",
} as const;
