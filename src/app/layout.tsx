import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AgeGate } from "@/components/AgeGate";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CartDrawer } from "@/components/CartDrawer";
import { CartToast } from "@/components/CartToast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Péptidos para investigación`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "péptidos",
    "investigación",
    "Bolivia",
    "Nextgen Labs",
    "Onyx Research",
    "research use only",
  ],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Péptidos para investigación`,
    description: siteConfig.description,
    images: [{ url: "/logo.svg", width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Péptidos para investigación`,
    description: siteConfig.description,
    images: ["/logo.svg"],
  },
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <AgeGate />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <WhatsAppButton />
        <CartDrawer />
        <CartToast />
      </body>
    </html>
  );
}
