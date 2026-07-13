"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Video de fondo del hero.
 *
 * Estrategia anti-"cargando":
 *  - El poster (`/hero-poster.jpg`, un fotograma real del propio video) se pinta
 *    como fondo desde el primer instante.
 *  - El elemento <video> permanece invisible (opacity 0) hasta que realmente está
 *    reproduciéndose (readyState suficiente, no pausado y con avance de tiempo).
 *    Así nunca se ve el recuadro negro/"cargando" del video en móvil: solo el
 *    poster, y luego el video ya en movimiento.
 *  - La revelación es instantánea (sin transición CSS, que en algunos entornos
 *    se queda "colgada"); como el poster y el video comparten imagen, el cambio
 *    es imperceptible.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Algunos navegadores móviles no autoreproducen sin un empujón explícito.
    video.play?.().catch(() => {});

    let raf = 0;
    const start = performance.now();
    const check = () => {
      const reallyPlaying =
        video.readyState >= 3 && !video.paused && video.currentTime > 0;
      // Fallback: si tras 4s no logró reproducirse (autoplay bloqueado), dejamos
      // de sondear y revelamos el video igualmente (mostrará su propio poster).
      if (reallyPlaying || performance.now() - start > 4000) {
        setPlaying(true);
        return;
      }
      raf = requestAnimationFrame(check);
    };
    check();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* Poster de respaldo: fotograma real del video, visible al instante */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-poster.jpg')" }}
      />
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: playing ? 1 : 0 }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/hero-poster.jpg"
      >
        <source src="/hero-loop.mp4" type="video/mp4" />
      </video>
    </>
  );
}
