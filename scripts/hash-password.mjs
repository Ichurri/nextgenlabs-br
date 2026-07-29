#!/usr/bin/env node
// Genera un hash scrypt "salt:hash" para ADMIN_PASSWORD_HASH.
//
// El algoritmo tiene que coincidir exactamente con hashPassword() en
// src/lib/auth.ts. No se importa desde ahí a propósito: este script corre
// con Node puro, sin transpilar TypeScript.

import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function promptHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rl.question(query, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    // Oculta el eco de cada tecla después de que se escribió el prompt.
    if (process.stdin.isTTY) {
      rl._writeToOutput = () => {};
    }
  });
}

const password = await promptHidden("Contraseña del panel (no se muestra en pantalla): ");

if (!password) {
  console.error("No ingresaste nada.");
  process.exit(1);
}

if (password.length < 20) {
  console.error(
    `Advertencia: tiene ${password.length} caracteres. Se recomiendan 20+, generados con el botón de tu gestor de contraseñas — no una inventada.\n`
  );
}

console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
