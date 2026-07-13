/**
 * Genera imágenes SVG placeholder de viales para cada producto.
 * Ejecutar: node scripts/generate-vials.mjs
 * El cliente puede reemplazar estos SVG por fotos reales (mismo nombre de archivo).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "products");
mkdirSync(outDir, { recursive: true });

// [archivo, nombre en la etiqueta, dosis, color del capuchón]
const vials = [
  ["tesamorelin", "TESAMORELIN", "10 MG", "#3b60d6"],
  ["ghk-cu", "GHK-CU", "100 MG", "#2f4fb0"],
  ["nad-plus", "NAD+", "500 MG", "#1f2937"],
  ["cjc-1295", "CJC-1295", "5 MG", "#3b60d6"],
  ["mt-2", "MT-2", "10 MG", "#334155"],
  ["mk-677", "MK-677", "25 MG", "#2f4fb0"],
  ["rad-140", "RAD-140", "10 MG", "#334155"],
  ["glow", "GLOW", "70 MG", "#3b82f6"],
  ["klow", "KLOW", "80 MG", "#3b82f6"],
  ["wolverine", "WOLVERINE", "60 MG", "#2f4fb0"],
  ["bpc-157", "BPC-157", "5 MG", "#3b60d6"],
  ["tb-500", "TB-500", "5 MG", "#3b60d6"],
  ["semaglutide", "SEMAGLUTIDE", "5 MG", "#2f4fb0"],
  ["ipamorelin", "IPAMORELIN", "5 MG", "#3b60d6"],
];

function svg(name, dose, cap) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141417"/>
      <stop offset="1" stop-color="#050506"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.6">
      <stop offset="0" stop-color="${cap}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${cap}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0c0f16"/>
      <stop offset="0.5" stop-color="#1b2230"/>
      <stop offset="1" stop-color="#0c0f16"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6b7280"/>
      <stop offset="0.5" stop-color="#e5e7eb"/>
      <stop offset="1" stop-color="#6b7280"/>
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#bg)"/>
  <rect width="400" height="500" fill="url(#glow)"/>
  <!-- vial -->
  <g transform="translate(150 90)">
    <!-- cap -->
    <rect x="8" y="0" width="84" height="34" rx="8" fill="${cap}"/>
    <rect x="14" y="30" width="72" height="18" rx="4" fill="url(#metal)"/>
    <rect x="30" y="46" width="40" height="14" fill="#c7cdd6"/>
    <!-- body -->
    <rect x="10" y="58" width="80" height="230" rx="16" fill="url(#glass)" stroke="#2b3446" stroke-width="1.5"/>
    <!-- highlight -->
    <rect x="20" y="72" width="10" height="200" rx="5" fill="#ffffff" opacity="0.12"/>
    <!-- label -->
    <rect x="10" y="150" width="80" height="120" fill="#0e0e11" opacity="0.92"/>
    <rect x="10" y="150" width="80" height="26" fill="#f5f5f7" opacity="0.9"/>
    <text x="50" y="167" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0a0a0a">ONYX</text>
    <text x="50" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#f5f5f7">${name}</text>
    <rect x="26" y="212" width="48" height="18" rx="3" fill="none" stroke="#8b93a1" stroke-width="1"/>
    <text x="50" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#cbd2dc">${dose}</text>
    <text x="50" y="246" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="#9aa2ae">99% Purity</text>
    <text x="50" y="257" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#7c828d">FOR RESEARCH USE ONLY</text>
  </g>
</svg>`;
}

for (const [file, name, dose, cap] of vials) {
  writeFileSync(join(outDir, `${file}.svg`), svg(name, dose, cap), "utf8");
}
console.log(`Generados ${vials.length} viales en public/products/`);
