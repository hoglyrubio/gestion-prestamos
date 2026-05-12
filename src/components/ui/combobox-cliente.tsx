"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Cliente {
  id: string
  nombres: string
  apellidos: string
  documento: string
}

interface Props {
  clientes: Cliente[]
  defaultValue?: string      // cliente_id inicial (en edición)
  disabled?: boolean
  name?: string              // nombre del hidden input (default: "cliente_id")
}

export function ClienteCombobox({
  clientes,
  defaultValue,
  disabled,
  name = "cliente_id",
}: Props) {
  const initial = defaultValue
    ? clientes.find((c) => c.id === defaultValue)
    : undefined

  const [query, setQuery] = useState(
    initial ? `${initial.nombres} ${initial.apellidos}` : ""
  )
  const [selectedId, setSelectedId] = useState(defaultValue ?? "")
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? clientes.filter((c) => {
        const q = query.toLowerCase()
        return (
          c.nombres.toLowerCase().includes(q) ||
          c.apellidos.toLowerCase().includes(q) ||
          c.documento.includes(q)
        )
      })
    : clientes

  const select = useCallback(
    (c: Cliente) => {
      setSelectedId(c.id)
      setQuery(`${c.nombres} ${c.apellidos}`)
      setOpen(false)
    },
    []
  )

  const clear = useCallback(() => {
    setSelectedId("")
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }, [])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        // Si el texto no corresponde a ningún cliente seleccionado, limpia
        if (!selectedId) setQuery("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [selectedId])

  // Navegación con teclado
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[highlighted]) select(filtered[highlighted])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // Scroll al ítem resaltado
  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement
    item?.scrollIntoView({ block: "nearest" })
  }, [highlighted])

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input con el valor real */}
      <input type="hidden" name={name} value={selectedId} />

      {/* Input de búsqueda */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder="Buscar por nombre o documento…"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedId("")
            setHighlighted(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={[
            "w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg text-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:bg-slate-50 disabled:text-slate-400",
            selectedId ? "bg-blue-50 border-blue-200" : "",
          ].join(" ")}
        />

        {/* Botón limpiar */}
        {(query || selectedId) && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm leading-none cursor-pointer"
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">
              No se encontraron clientes
            </li>
          ) : (
            filtered.map((c, i) => (
              <li
                key={c.id}
                onMouseDown={(e) => { e.preventDefault(); select(c) }}
                onMouseEnter={() => setHighlighted(i)}
                className={[
                  "px-4 py-2.5 cursor-pointer text-sm transition-colors",
                  i === highlighted ? "bg-blue-50" : "hover:bg-slate-50",
                  selectedId === c.id ? "font-medium text-blue-700" : "text-slate-900",
                ].join(" ")}
              >
                <span className="font-medium">{c.nombres} {c.apellidos}</span>
                <span className="ml-2 text-xs text-slate-400 font-mono">{c.documento}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
