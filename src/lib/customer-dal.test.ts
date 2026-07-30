import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const { mockGetUser, mockRedirect, mockProfileMaybeSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  mockProfileMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase-auth", () => ({
  createSupabaseAuthClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockProfileMaybeSingle,
        })),
      })),
    })),
  },
}));

import { getCustomer, requireCustomer, requireApiCustomer, getCustomerProfile } from "@/lib/customer-dal";

beforeEach(() => {
  mockGetUser.mockReset();
  mockRedirect.mockClear();
  mockProfileMaybeSingle.mockReset();
});

describe("getCustomer", () => {
  it("sin cookie (getUser sin user) devuelve null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await getCustomer()).toBeNull();
  });

  it("cookie inválida (getUser con error) devuelve null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    expect(await getCustomer()).toBeNull();
  });

  it("sesión válida devuelve el comprador", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" } },
      error: null,
    });
    expect(await getCustomer()).toEqual({ id: "u1", email: "a@b.com" });
  });
});

describe("requireCustomer", () => {
  it("sin sesión redirige a /cuenta/ingresar con la ruta original", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireCustomer("/checkout")).rejects.toThrow(
      "REDIRECT:/cuenta/ingresar?next=%2Fcheckout"
    );
  });

  it("con sesión devuelve el comprador sin redirigir", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" } },
      error: null,
    });
    expect(await requireCustomer("/checkout")).toEqual({ id: "u1", email: "a@b.com" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe("requireApiCustomer", () => {
  it("sin sesión devuelve 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await requireApiCustomer();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("con sesión devuelve el comprador", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" } },
      error: null,
    });
    const result = await requireApiCustomer();
    expect(result).toEqual({ id: "u1", email: "a@b.com" });
  });
});

describe("getCustomerProfile", () => {
  it("perfil inexistente devuelve null", async () => {
    mockProfileMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getCustomerProfile("u1")).toBeNull();
  });

  it("mapea la fila de customer_profiles", async () => {
    mockProfileMaybeSingle.mockResolvedValue({
      data: { full_name: "Ana", phone: "69437674", city: "Santa Cruz", address: null },
      error: null,
    });
    expect(await getCustomerProfile("u1")).toEqual({
      fullName: "Ana",
      phone: "69437674",
      city: "Santa Cruz",
      address: null,
    });
  });
});
