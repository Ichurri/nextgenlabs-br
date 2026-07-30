import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Sistema de auth aparte del de /admin (src/lib/dal.ts): un comprador logueado
// no abre el panel del dueño y viceversa. No se mezclan a propósito.

export type Customer = {
  id: string;
  email: string;
};

/**
 * Identidad real del comprador: llama a supabase.auth.getUser(), que verifica
 * el JWT contra el servidor de Auth. Nunca getSession() — esa solo lee la
 * cookie sin validar la firma, y es la confusión más común de esta librería.
 * Memoizada con cache() de React: una sola verificación por render.
 */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

/** Server Components de /cuenta: sin sesión válida, redirige al login. */
export async function requireCustomer(nextPath: string): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) {
    redirect(`/cuenta/ingresar?next=${encodeURIComponent(nextPath)}`);
  }
  return customer;
}

/** Route Handlers de /api/cuenta y /api/pedidos: sin sesión válida, 401. */
export async function requireApiCustomer(): Promise<Customer | NextResponse> {
  const customer = await getCustomer();
  if (!customer) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return customer;
}

export type CreateCustomerInput = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  city: string;
  address?: string | null;
};

export type CreateCustomerResult =
  | { ok: true; customer: Customer }
  | { ok: false; error: string; status: number };

/**
 * signUp() + insert en customer_profiles. Usado tanto por
 * POST /api/cuenta/registro como por el checkout sin sesión (Bloque B) para
 * no duplicar esta secuencia en dos Route Handlers.
 *
 * Con "Confirm email" desactivado (00-contexto.md, decisión de fase 8),
 * signUp() devuelve sesión de una — no hace falta abrir el correo para
 * terminar de registrarse.
 */
export async function createCustomerAccount(
  input: CreateCustomerInput
): Promise<CreateCustomerResult> {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error) {
    const isDuplicate = error.status === 422 || /already registered/i.test(error.message);
    if (isDuplicate) {
      return { ok: false, status: 409, error: "Ese correo ya tiene una cuenta. Iniciá sesión." };
    }
    // 429 "email rate limit exceeded": el mailer de Supabase (sin SMTP
    // propio configurado, o con "Confirm email" activo) tiene un límite muy
    // bajo de correos por hora. No es un error del comprador — se distingue
    // para no decirle "probá de nuevo" a algo que va a volver a fallar.
    if (error.status === 429) {
      return {
        ok: false,
        status: 503,
        error: "Estamos recibiendo muchos registros ahora mismo. Probá en unos minutos.",
      };
    }
    return { ok: false, status: 500, error: "No pudimos crear la cuenta. Probá de nuevo." };
  }

  // Con "Confirm email" apagado, un signUp a un correo ya registrado no
  // siempre devuelve error explícito: Supabase responde 200 con un usuario
  // sin identidades nuevas. Es la forma documentada de detectar "ya existe"
  // sin filtrar a quien no lo sabe si el correo está registrado.
  if (!data.user || data.user.identities?.length === 0) {
    return {
      ok: false,
      status: 409,
      error: "Ese correo ya tiene una cuenta. Iniciá sesión.",
    };
  }

  const { error: profileError } = await supabaseAdmin.from("customer_profiles").insert({
    user_id: data.user.id,
    full_name: input.fullName,
    phone: input.phone,
    city: input.city,
    address: input.address ?? null,
  });

  if (profileError) {
    // La cuenta de Auth ya existe y ya tiene sesión activa: no se revierte.
    // Es preferible que el comprador quede logueado y complete el perfil
    // después a perder la cuenta que recién creó.
    console.error("create_customer_profile_failed", profileError.code);
  }

  return {
    ok: true,
    customer: { id: data.user.id, email: data.user.email ?? input.email },
  };
}

export type CustomerProfile = {
  fullName: string;
  phone: string;
  city: string | null;
  address: string | null;
};

/**
 * customer_profiles tiene RLS habilitado sin policies (00-contexto.md §5):
 * ni el propio dueño de la fila puede leerla con la anon key. Se lee siempre
 * con supabaseAdmin (service key), igual que orders y order_items.
 */
export const getCustomerProfile = cache(
  async (userId: string): Promise<CustomerProfile | null> => {
    const { data, error } = await supabaseAdmin
      .from("customer_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      fullName: data.full_name,
      phone: data.phone,
      city: data.city,
      address: data.address,
    };
  }
);
