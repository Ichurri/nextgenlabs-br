import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar | Panel de pedidos",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold">Panel de pedidos</h1>
      <p className="mt-1 text-sm text-muted">Ingresá la contraseña del panel.</p>
      <LoginForm />
    </div>
  );
}
