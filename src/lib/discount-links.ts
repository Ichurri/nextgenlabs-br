import { siteConfig } from "@/config/site";

/** Link para compartir: el catálogo con el descuento ya cargado (ver ApplyCodeFromUrl). */
export function buildCodeShareUrl(code: string): string {
  return `${siteConfig.url}/catalogo?codigo=${encodeURIComponent(code)}`;
}

/**
 * Link privado con las ventas de un código. El token ES la credencial: quien
 * lo tenga ve estos números, por eso se regenera desde el panel si se filtra.
 */
export function buildCodeSalesUrl(publicToken: string): string {
  return `${siteConfig.url}/mis-ventas/${encodeURIComponent(publicToken)}`;
}
