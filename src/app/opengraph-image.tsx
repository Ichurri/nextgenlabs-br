import {
  ogImageAlt,
  ogImageContentType,
  ogImageSize,
  renderBrandOgImage,
} from "@/lib/brand-og-image";

export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderBrandOgImage();
}
