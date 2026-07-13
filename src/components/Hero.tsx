import Link from "next/link";
import Image from "next/image";
import { HeroVideo } from "@/components/HeroVideo";

export function Hero() {
  return (
    <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden">
      {/* Video de fondo con poster de fotograma real (ver HeroVideo) */}
      <HeroVideo />

      {/* Overlay oscuro + viñeta */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
        <Image
          src="/logo.svg"
          alt="Nextgen Labs"
          width={280}
          height={84}
          priority
          className="mx-auto mb-8 h-auto w-56 object-contain sm:w-72"
        />
        <p className="eyebrow mb-4">Péptidos para investigación · Bolivia</p>
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Calidad verificada.
          <br />
          <span className="text-accent-light">Transparencia total.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Péptidos exclusivamente para uso de investigación, con pureza probada
          de forma independiente. Distribuidor oficial de Onyx Research.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/catalogo"
            className="w-full rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light sm:w-auto"
          >
            Ver catálogo
          </Link>
          <Link
            href="#sobre"
            className="w-full rounded-lg border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
          >
            Conocer más
          </Link>
        </div>
        <p className="mt-8 text-xs uppercase tracking-widest text-muted/80">
          Solo para uso de investigación · No apto para consumo humano
        </p>
      </div>
    </section>
  );
}
