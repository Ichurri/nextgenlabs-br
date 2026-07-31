import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/products-data";

const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/catalogo", priority: 0.9, changeFrequency: "weekly" },
  { path: "/envios", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.5, changeFrequency: "monthly" },
  { path: "/preguntas-frecuentes", priority: 0.5, changeFrequency: "monthly" },
  { path: "/carrito", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terminos", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacidad", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getCatalog();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteConfig.url}/producto/${product.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
