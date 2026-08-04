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
  /** true cuando el código vino del mensaje pegado: no se puede editar acá. */
  discountCodeLocked: boolean;
};

/** Datos del comprador (el WhatsApp nunca viene en el mensaje, lo escribe el admin) y código de descuento. */
export function ReceiptCustomerFields({
  form,
  onChange,
  discountCode,
  onDiscountCodeChange,
  discountCodeLocked,
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
        <Field label="Dirección">
          <input
            value={form.address}
            disabled
            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
          />
          <span className="mt-1 block text-xs text-muted">
            Viene del mensaje (solo existe para Cochabamba), no se puede editar acá.
          </span>
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

      <Field label="Código de descuento (opcional)">
        <input
          value={discountCode}
          onChange={(e) => onDiscountCodeChange(e.target.value.toUpperCase())}
          disabled={discountCodeLocked}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
        {discountCodeLocked && (
          <span className="mt-1 block text-xs text-muted">
            Viene del mensaje, no se puede editar acá.
          </span>
        )}
      </Field>
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
