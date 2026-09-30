import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";
export const ogImageAlt = `${siteConfig.name} — Peptídeos para pesquisa no Brasil`;

/**
 * Genera la imagen de marca por defecto usada como OG/Twitter image en todo
 * el sitio (excepto donde una ruta la sobreescribe, ej. producto/[slug]).
 * Reutiliza el logo real (public/logo.svg) y la tipografía Inter embebidos
 * como binarios locales para no depender de red en build time.
 */
export async function renderBrandOgImage() {
  const [logoSvg, interBold] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.svg")),
    readFile(join(process.cwd(), "src/assets/fonts/Inter-Bold.ttf")),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logoSvg.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #111113 0%, #0a0a0a 60%)",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 6,
            color: "#60a5fa",
            marginBottom: 36,
          }}
        >
          PEPTÍDEOS PARA PESQUISA · BRASIL
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) requires a raw <img>, not next/image */}
        <img src={logoSrc} alt="" width={420} height={98} />
        <div
          style={{
            display: "flex",
            fontSize: 42,
            fontWeight: 700,
            color: "#f5f5f7",
            marginTop: 44,
            textAlign: "center",
          }}
        >
          Qualidade verificada. Transparência total.
        </div>
        <div
          style={{
            display: "flex",
            width: 140,
            height: 4,
            borderRadius: 4,
            background: "#3b82f6",
            marginTop: 40,
          }}
        />
      </div>
    ),
    {
      ...ogImageSize,
      fonts: [{ name: "Inter", data: interBold, style: "normal", weight: 700 }],
    }
  );
}
