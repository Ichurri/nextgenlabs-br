"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Video de fondo del hero.
 *
 * Estrategia anti-"cargando":
 *  - El poster (`/hero-poster.jpg`, un fotograma real del propio video,
 *    comprimido a ~58 KB) se pinta como fondo desde el primer instante.
 *  - El <video> permanece invisible hasta que el navegador emite `playing`,
 *    es decir, hasta que de verdad hay movimiento. Si el autoplay está
 *    bloqueado (p. ej. iOS en modo de ahorro de batería), el video NUNCA se
 *    revela: se queda el poster, sin recuadro negro ni glifo ▶ de iOS.
 *  - Al primer toque/click en la página se reintenta `play()` — iOS permite
 *    reproducir tras un gesto del usuario — y ahí recién se revela.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => setPlaying(true);
    video.addEventListener("playing", onPlaying);
    // Si el video se pausa o se estanca en t=0 (p. ej. buffer vacío al
    // reiniciar el loop en conexiones lentas), volver al poster para no
    // dejar un fotograma congelado/negro en pantalla.
    const onStall = () => {
      if (video.currentTime === 0) setPlaying(false);
    };
    video.addEventListener("pause", onStall);
    video.addEventListener("waiting", onStall);
    // El autoplay puede haber arrancado antes de la hidratación de React
    // (el evento `playing` ya pasó): comprobar el estado actual también.
    if (!video.paused && video.readyState >= 3 && video.currentTime > 0) {
      setPlaying(true);
    }

    const tryPlay = () => video.play().catch(() => {});
    tryPlay();

    // Autoplay bloqueado (ahorro de batería / data saver): reintentar al
    // primer gesto del usuario, que es cuando iOS/Android lo permiten.
    const onFirstGesture = () => tryPlay();
    window.addEventListener("touchstart", onFirstGesture, {
      once: true,
      passive: true,
    });
    window.addEventListener("click", onFirstGesture, { once: true });

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onStall);
      video.removeEventListener("waiting", onStall);
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("click", onFirstGesture);
    };
  }, []);

  return (
    <>
      {/* Poster de respaldo: fotograma real del video, visible al instante.
          En móvil el encuadre se corre hacia la derecha del cuadro (donde está
          el vial); en pantallas anchas (md+) se mantiene centrado. El poster y
          el video usan la misma posición para que el cambio sea imperceptible. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-[position:72%_center] md:bg-center"
        style={{ backgroundImage: "url('/hero-poster.jpg')" }}
      />
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-[72%_center] md:object-center"
        style={{ opacity: playing ? 1 : 0 }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/hero-loop.mp4" type="video/mp4" />
      </video>
    </>
  );
}
