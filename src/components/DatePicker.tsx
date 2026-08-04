"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  /** Fecha en formato "YYYY-MM-DD", o null si no hay ninguna elegida. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  compact?: boolean;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Debe cubrir el trigger + la grilla completa (cabecera, 6 filas de días y
// el botón "Quitar fecha"), igual que MENU_SPACE_PX en Select.tsx.
const POPOVER_SPACE_PX = 340;

/** "YYYY-MM-DD" → Date local. new Date(iso) directo parsea como UTC y en
 * Bolivia (UTC-4) puede mostrar un día antes — por eso se arma a mano. */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
  return parseISODate(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Domingo=0 en JS → se corre a Lunes=0 para que la grilla empiece en lunes. */
function mondayOffset(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/**
 * Selector de fecha propio: un `<input type="date">` nativo abre el
 * calendario del navegador/SO, que no se puede restylear (mismo problema que
 * el `<select>` nativo, ver Select.tsx). Reemplaza trigger + grilla con los
 * mismos tokens que el resto del sitio.
 */
export function DatePicker({ value, onChange, placeholder, compact = false }: Props) {
  const selected = value ? parseISODate(value) : null;
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<"up" | "down">("down");
  const [viewDate, setViewDate] = useState(selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function toggleOpen() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setViewDate(selected ?? new Date());
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(
        spaceBelow >= POPOVER_SPACE_PX || spaceBelow >= spaceAbove ? "down" : "up"
      );
    }
    setIsOpen(true);
  }

  function selectDay(day: Date) {
    onChange(toISODate(day));
    setIsOpen(false);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = mondayOffset(firstOfMonth.getDay());
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const todayIso = toISODate(new Date());

  const triggerClass = compact
    ? "focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs outline-none transition"
    : "focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={toggleOpen}
        className={`${triggerClass} ${isOpen ? "border-accent-light" : ""}`}
      >
        <span className={value ? "" : "text-muted"}>{value ? formatDisplay(value) : placeholder}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-muted"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Elegir fecha"
          className={`absolute z-20 w-64 rounded-lg border border-border bg-surface-2 p-3 shadow-lg animate-fade-in ${
            openDirection === "down" ? "top-full mt-1.5" : "bottom-full mb-1.5"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Mes anterior"
              className="focus-ring rounded p-1 text-muted transition hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-xs font-medium">
              {MONTH_LABELS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Mes siguiente"
              className="focus-ring rounded p-1 text-muted transition hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-muted">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-y-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((day) => {
              const iso = toISODate(day);
              const isSelected = value === iso;
              const isToday = todayIso === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`focus-ring mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs transition ${
                    isSelected
                      ? "bg-accent text-white"
                      : isToday
                        ? "border border-accent-light/60 text-accent-light"
                        : "text-foreground hover:bg-surface"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="focus-ring mt-2 w-full rounded-md border border-border py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              Quitar fecha
            </button>
          )}
        </div>
      )}
    </div>
  );
}
