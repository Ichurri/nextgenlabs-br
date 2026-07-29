import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

describe("hashPassword / verifyPassword", () => {
  it("acepta la contraseña correcta", () => {
    const hash = hashPassword("correcta-y-larga-123");
    expect(verifyPassword("correcta-y-larga-123", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", () => {
    const hash = hashPassword("correcta-y-larga-123");
    expect(verifyPassword("otra-cosa", hash)).toBe(false);
  });

  it("genera un salt distinto para la misma contraseña, así que los hashes no colisionan", () => {
    const a = hashPassword("misma-contraseña");
    const b = hashPassword("misma-contraseña");
    expect(a).not.toBe(b);
    expect(verifyPassword("misma-contraseña", a)).toBe(true);
    expect(verifyPassword("misma-contraseña", b)).toBe(true);
  });

  it("rechaza un hash malformado sin explotar", () => {
    expect(verifyPassword("cualquiera", "sin-formato-salt-hash")).toBe(false);
  });
});

describe("signSession / verifySession", () => {
  const secret = "un-secreto-de-prueba-32-bytes-o-mas";

  it("una sesión recién firmada verifica", () => {
    const token = signSession(secret, 60 * 60);
    expect(verifySession(token, secret)).toBe(true);
  });

  it("rechaza una sesión expirada", () => {
    const token = signSession(secret, -1);
    expect(verifySession(token, secret)).toBe(false);
  });

  it("rechaza una sesión con la firma alterada", () => {
    const token = signSession(secret, 60 * 60);
    const [data, signature] = token.split(".");
    const tamperedChar = signature[0] === "a" ? "b" : "a";
    const tampered = `${data}.${tamperedChar}${signature.slice(1)}`;
    expect(verifySession(tampered, secret)).toBe(false);
  });

  it("rechaza una sesión firmada con otro secreto", () => {
    const token = signSession("otro-secreto-distinto-tambien-largo", 60 * 60);
    expect(verifySession(token, secret)).toBe(false);
  });

  it("rechaza un token sin el formato data.firma", () => {
    expect(verifySession("token-sin-punto", secret)).toBe(false);
  });
});
