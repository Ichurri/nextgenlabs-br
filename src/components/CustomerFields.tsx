type Props = {
  name: string;
  onNameChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  // Mantidos para compatibilidade com o estado do carrinho anterior.
  wantsDelivery: boolean;
  onWantsDeliveryChange: (value: boolean) => void;
  address: string;
  onAddressChange: (value: string) => void;
  compact?: boolean;
};

/** Dados opcionais usados para preencher a mensagem do pedido no WhatsApp. */
export function CustomerFields({
  name,
  onNameChange,
  city,
  onCityChange,
  address,
  onAddressChange,
  compact = false,
}: Props) {
  const inputClass = compact
    ? "focus-ring w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs outline-none transition"
    : "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";
  const labelClass = compact ? "mb-1 block text-xs font-medium" : "mb-1.5 block text-sm font-medium";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
        <label className="block">
          <span className={labelClass}>Nome e sobrenome</span>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex.: Ana Silva"
            autoComplete="name"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Cidade</span>
          <input
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Ex.: São Paulo"
            autoComplete="address-level2"
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Endereço de entrega (opcional)</span>
        <input
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Rua, número, bairro e CEP"
          autoComplete="street-address"
          className={inputClass}
        />
      </label>
    </div>
  );
}
