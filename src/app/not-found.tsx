import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no existe o fue movida.",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="eyebrow mb-4">Error 404</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        No encontramos esta página
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        Puede que el enlace esté roto o que el producto ya no esté disponible.
        Explora nuestro catálogo completo de péptidos para investigación.
      </p>
      <Link
        href="/catalogo"
        className="focus-ring mt-8 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
      >
        Ver catálogo
      </Link>
    </div>
  );
}
