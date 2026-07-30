import type { Metadata } from "next";
import Link from "next/link";
import { RecoverForm } from "@/components/cuenta/RecoverForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-muted">Te mandamos un link para elegir una nueva.</p>
      {error === "link_invalido" && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          Ese link venció o ya se usó. Pedí uno nuevo.
        </p>
      )}
      <RecoverForm />
      <p className="mt-6 text-center text-sm">
        <Link
          href="/cuenta/ingresar"
          className="focus-ring rounded text-muted hover:text-foreground"
        >
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
