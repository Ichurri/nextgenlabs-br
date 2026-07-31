import { BOLIVIA_CITIES } from "@/data/bolivia-cities";

// Único caso con envío local / recojo en punto de atención. En cualquier
// otra ciudad no existe el concepto de "dirección" en el sitio — se
// coordina aparte, por WhatsApp, junto con el costo de envío nacional.
// Se exporta para que CartDrawer.tsx y /carrito la usen al armar el
// mensaje de WhatsApp, sin repetir el string a mano en cada lugar.
export const LOCAL_DELIVERY_CITY = "Cochabamba";

type Props = {
  name: string;
  onNameChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  wantsDelivery: boolean;
  onWantsDeliveryChange: (value: boolean) => void;
  address: string;
  onAddressChange: (value: string) => void;
  /** Versión angosta para el drawer del carrito: texto e input más chicos. */
  compact?: boolean;
};

/**
 * Nombre, ciudad y — solo para Cochabamba — envío a domicilio vs. recojo,
 * para prellenar "Mis datos" en el mensaje de WhatsApp (ver
 * buildOrderMessage en whatsapp.ts). Nada de esto es obligatorio: el botón
 * de WhatsApp nunca se bloquea, si quedan vacíos el mensaje cae en las
 * etiquetas en blanco de siempre (o, en el caso de la dirección, la línea
 * se omite directamente — ver whatsapp.ts).
 */
export function CustomerFields({
  name,
  onNameChange,
  city,
  onCityChange,
  wantsDelivery,
  onWantsDeliveryChange,
  address,
  onAddressChange,
  compact = false,
}: Props) {
  const inputClass = compact
    ? "focus-ring w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs outline-none transition"
    : "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";
  const labelClass = compact ? "mb-1 block text-xs font-medium" : "mb-1.5 block text-sm font-medium";
  const isLocalDelivery = city === LOCAL_DELIVERY_CITY;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
        <label className="block">
          <span className={labelClass}>Nombre y Apellido</span>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ej. Juan Pérez"
            autoComplete="name"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Ciudad</span>
          <select value={city} onChange={(e) => onCityChange(e.target.value)} className={inputClass}>
            <option value="">Elegí tu ciudad</option>
            {BOLIVIA_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLocalDelivery && (
        <div className={compact ? "space-y-2" : "space-y-3"}>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={wantsDelivery}
              onChange={(e) => onWantsDeliveryChange(e.target.checked)}
              className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <span className={compact ? "text-xs leading-snug" : "text-sm leading-snug"}>
              Deseo que el pedido sea enviado a mi domicilio. Si no selecciona esta opción, deberá
              recoger su pedido en nuestro punto de atención en Cochabamba.
            </span>
          </label>

          {wantsDelivery && (
            <label className="block">
              <span className={labelClass}>Dirección de envío</span>
              <input
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="Ej. Av. América #123, Zona Central"
                autoComplete="street-address"
                className={inputClass}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
