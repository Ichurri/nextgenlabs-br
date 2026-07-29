import { randomBytes, scryptSync, createHmac, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

/** Genera un hash scrypt "salt:hash" en hex a partir de una contraseña en texto plano. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

/** Compara una contraseña contra un hash "salt:hash", en tiempo constante. */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = scryptSync(password, salt, SCRYPT_KEYLEN);

  if (hashBuffer.length !== candidateBuffer.length) return false;
  return timingSafeEqual(hashBuffer, candidateBuffer);
}

type SessionPayload = { exp: number };

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Firma una sesión que expira en `maxAgeSeconds` a partir de ahora. */
export function signSession(secret: string, maxAgeSeconds: number): string {
  const payload: SessionPayload = { exp: Date.now() + maxAgeSeconds * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

/** Verifica la firma HMAC y la expiración de una cookie de sesión. */
export function verifySession(token: string, secret: string): boolean {
  const [data, signature] = token.split(".");
  if (!data || !signature) return false;

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(sign(data, secret), "hex");
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  return typeof payload.exp === "number" && payload.exp > Date.now();
}
