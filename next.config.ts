import type { NextConfig } from "next";

// Las imágenes de producto subidas desde el panel (Fase 10) viven en
// Supabase Storage como URL absoluta. Si la variable falta en el entorno de
// build, remotePatterns queda vacío y el build no explota — simplemente
// next/image rechazaría esas URLs hasta que se configure.
function supabaseStorageHostname(): string | null {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = supabaseStorageHostname();

const nextConfig: NextConfig = {
  images: {
    // Los viales placeholder son SVG. Al reemplazarlos por fotos reales
    // (jpg/png/webp) esto sigue funcionando sin cambios.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
