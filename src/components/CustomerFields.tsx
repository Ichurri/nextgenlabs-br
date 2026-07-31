import { BOLIVIA_CITIES } from "@/data/bolivia-cities";

type Props = {
  name: string;
  onNameChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  /** Versión angosta para el drawer del carrito: texto e input más chicos. */
  compact?: boolean;
};

/**
 * Nombre y ciudad del comprador, para prellenar "Mis datos" en el mensaje de
 * WhatsApp (ver buildOrderMessage en whatsapp.ts). Ninguno de los dos es
 * obligatorio: el botón de WhatsApp nunca se bloquea por esto, si quedan
 * vacíos el mensaje cae en las etiquetas en blanco de siempre.
 */
export function CustomerFields({ name, onNameChange, city, onCityChange, compact = false }: Props) {
  const inputClass = compact
    ? "focus-ring w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs outline-none transition"
    : "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";
  const labelClass = compact ? "mb-1 block text-xs font-medium" : "mb-1.5 block text-sm font-medium";

  return (
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
  );
}
