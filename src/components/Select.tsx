"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = string | { value: string; label: string };

function normalizeOption(option: SelectOption): { value: string; label: string } {
  return typeof option === "string" ? { value: option, label: option } : option;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder: string;
  /** Versión angosta para el drawer del carrito: texto y padding más chicos. */
  compact?: boolean;
};

// Debe coincidir con max-h-64 (16rem) de la lista de abajo, más el margen de
// separación (mb-1.5/mt-1.5 = 0.375rem): así "auto" sabe cuánto espacio real
// necesita antes de decidir para qué lado abrir.
const MENU_SPACE_PX = 280;

/**
 * Select propio: un `<select>` nativo no se puede restylear cross-browser
 * (el popup de opciones sale con el look por defecto del navegador/SO, ver
 * captura del reporte). Este reemplaza trigger + lista de opciones con los
 * mismos tokens que el resto del sitio.
 *
 * Se abre hacia abajo o hacia arriba según el espacio disponible en el
 * viewport al momento de abrir (mide con getBoundingClientRect) — el mismo
 * componente sirve tanto para un campo cerca del borde inferior (ciudad en
 * el carrito) como uno cerca del borde superior (tipo de descuento).
 */
export function Select({ value, onChange, options, placeholder, compact = false }: Props) {
  const normalized = options.map(normalizeOption);
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<"up" | "down">("down");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  function openMenu() {
    const currentIndex = normalized.findIndex((o) => o.value === value);
    setHighlightedIndex(Math.max(currentIndex, 0));

    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(
        spaceBelow >= MENU_SPACE_PX || spaceBelow >= spaceAbove ? "down" : "up"
      );
    }
    setIsOpen(true);
  }

  function selectIndex(index: number) {
    const next = normalized[index];
    if (next !== undefined) onChange(next.value);
    setIsOpen(false);
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, normalized.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectIndex(highlightedIndex);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  }

  const triggerClass = compact
    ? "focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs outline-none transition"
    : "focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";

  const selectedLabel = normalized.find((o) => o.value === value)?.label;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openMenu();
          }
        }}
        className={`${triggerClass} ${isOpen ? "border-accent-light" : ""}`}
      >
        <span className={selectedLabel ? "" : "text-muted"}>{selectedLabel ?? placeholder}</span>
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
          className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          ref={listRef}
          onKeyDown={onListKeyDown}
          className={`absolute z-20 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface-2 p-1 text-sm shadow-lg animate-fade-in ${
            openDirection === "down" ? "top-full mt-1.5" : "bottom-full mb-1.5"
          }`}
        >
          {normalized.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectIndex(index)}
              className={`cursor-pointer rounded-md px-3 py-2 transition ${
                index === highlightedIndex ? "bg-accent/15 text-accent-light" : "hover:bg-surface"
              } ${option.value === value ? "font-medium" : ""}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
