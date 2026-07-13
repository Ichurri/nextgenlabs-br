import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Respuestas a las preguntas más comunes sobre pedidos, pureza, COA y envíos de Nextgen Labs.",
};

// PLACEHOLDER: contenido editable — ajusta las respuestas al operar real.
const faqs = [
  {
    q: "¿Para qué uso están destinados los productos?",
    a: "Todos nuestros productos son exclusivamente para uso de investigación de laboratorio. No están aprobados para consumo humano ni para uso diagnóstico o terapéutico.",
  },
  {
    q: "¿Cómo hago un pedido?",
    a: "Agrega los productos al carrito y pulsa «Finalizar pedido por WhatsApp». Se abrirá WhatsApp con el detalle de tu pedido ya cargado; ahí coordinamos el pago y la entrega.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "El pago se coordina de forma directa por WhatsApp una vez confirmado el pedido. No procesamos pagos en línea en el sitio.",
  },
  {
    q: "¿Los productos cuentan con Certificado de Análisis (COA)?",
    a: "Sí. Cada lote se analiza de forma independiente para verificar identidad y pureza. Puedes solicitar el COA del lote correspondiente por WhatsApp.",
  },
  {
    q: "¿Realizan envíos a todo el país?",
    a: "Coordinamos envíos discretos dentro de Bolivia. Los detalles de cobertura, costos y tiempos se confirman por WhatsApp al cerrar el pedido.",
  },
  {
    q: "¿Son ustedes distribuidor oficial de Onyx Research?",
    a: "Sí. Nextgen Labs es distribuidor oficial autorizado de Onyx Research en Bolivia.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow mb-2">Ayuda</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Preguntas frecuentes
      </h1>

      <div className="mt-10 space-y-3">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border bg-surface p-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold">
              {item.q}
              <span className="text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">¿No encontraste tu respuesta?</p>
        <Link
          href="/contacto"
          className="mt-3 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light"
        >
          Contáctanos
        </Link>
      </div>
    </div>
  );
}
