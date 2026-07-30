import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/cuenta/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false, follow: false },
};

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold">Creá tu cuenta</h1>
      <p className="mt-1 text-sm text-muted">
        Para ver tus pedidos desde cualquier dispositivo.
      </p>
      <RegisterForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link
          href={`/cuenta/ingresar${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="focus-ring rounded font-semibold text-accent-light hover:underline"
        >
          Ingresá
        </Link>
      </p>
    </div>
  );
}
