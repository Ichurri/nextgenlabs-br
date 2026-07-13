import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Los viales placeholder son SVG. Al reemplazarlos por fotos reales
    // (jpg/png/webp) esto sigue funcionando sin cambios.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
