import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/cuenta/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold">Ingresá a tu cuenta</h1>
      <p className="mt-1 text-sm text-muted">Con tu correo y tu contraseña.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tenés cuenta?{" "}
        <Link
          href={`/cuenta/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="focus-ring rounded font-semibold text-accent-light hover:underline"
        >
          Registrate
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link
          href="/cuenta/recuperar"
          className="focus-ring rounded text-muted hover:text-foreground"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </div>
  );
}
