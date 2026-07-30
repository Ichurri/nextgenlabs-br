import type { ReactNode } from "react";

export type ReceiptCustomerForm = {
  name: string;
  phone: string;
  city: string;
  address: string;
  note: string;
};

type Props = {
  form: ReceiptCustomerForm;
  onChange: <K extends keyof ReceiptCustomerForm>(key: K, value: ReceiptCustomerForm[K]) => void;
  discountCode: string;
  onDiscountCodeChange: (value: string) => void;
  isPaid: boolean;
  onIsPaidChange: (value: boolean) => void;
};

/** Datos del comprador (el WhatsApp nunca viene en el mensaje, lo escribe el admin), código y estado de pago. */
export function ReceiptCustomerFields({
  form,
  onChange,
  discountCode,
  onDiscountCodeChange,
  isPaid,
  onIsPaidChange,
}: Props) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo">
          <input value={form.name} onChange={(e) => onChange("name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="WhatsApp">
          <input
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="69437674"
            className={inputClass}
          />
        </Field>
        <Field label="Ciudad">
          <input value={form.city} onChange={(e) => onChange("city", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Dirección (opcional)">
          <input value={form.address} onChange={(e) => onChange("address", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Nota (opcional)">
        <textarea
          value={form.note}
          onChange={(e) => onChange("note", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código de descuento (opcional)">
          <input
            value={discountCode}
            onChange={(e) => onDiscountCodeChange(e.target.value.toUpperCase())}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => onIsPaidChange(e.target.checked)}
            className="focus-ring h-4 w-4 rounded border-border"
          />
          Ya está pagado
        </label>
      </div>
    </>
  );
}

const inputClass =
  "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
