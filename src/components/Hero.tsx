import Link from "next/link";
import Image from "next/image";
import { HeroVideo } from "@/components/HeroVideo";

export function Hero() {
  return (
    <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden">
      {/* Video de fondo con poster de fotograma real (ver HeroVideo) */}
      <HeroVideo />

      {/* Overlay oscuro + viñeta */}
      <div className="absolute inset-0 bg-background/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
        <Image
          src="/logo.svg"
          alt="Nextgen Labs"
          width={280}
          height={84}
          priority
          className="mx-auto mb-8 h-auto w-56 object-contain sm:w-72"
        />
        <p className="eyebrow mb-4">Peptídeos para pesquisa · Brasil</p>
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Qualidade verificada.
          <br />
          <span className="text-accent-light">Transparência total.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Compostos destinados exclusivamente à pesquisa laboratorial. Consulte as informações e os certificados disponíveis para cada produto.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/catalogo"
            className="focus-ring w-full rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light sm:w-auto"
          >
            Ver catálogo
          </Link>
          <Link
            href="#sobre"
            className="focus-ring w-full rounded-lg border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
          >
            Saiba mais
          </Link>
        </div>
        <p className="mt-8 text-xs uppercase tracking-widest text-muted/80">
          Exclusivamente para pesquisa · Não destinado ao consumo humano
        </p>
      </div>
    </section>
  );
}
