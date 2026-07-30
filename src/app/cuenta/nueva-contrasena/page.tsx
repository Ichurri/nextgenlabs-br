import type { Metadata } from "next";
import Link from "next/link";
import { getCustomer } from "@/lib/customer-dal";
import { NewPasswordForm } from "@/components/cuenta/NewPasswordForm";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

export default async function NuevaContrasenaPage() {
  // La sesión de recuperación la deja /api/cuenta/confirmar al canjear el
  // código del correo. Sin esa sesión, este link no sirve para nada.
  const customer = await getCustomer();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold">Elegí una nueva contraseña</h1>
      {customer ? (
        <NewPasswordForm />
      ) : (
        <>
          <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Ese link venció o ya se usó.
          </p>
          <p className="mt-6 text-center text-sm">
            <Link
              href="/cuenta/recuperar"
              className="focus-ring rounded font-semibold text-accent-light hover:underline"
            >
              Pedir un link nuevo
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
