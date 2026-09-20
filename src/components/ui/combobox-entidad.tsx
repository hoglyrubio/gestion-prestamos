"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Entidad { id: string; nombre: string }

interface Props {
  entidades: Entidad[]
  defaultValue?: string
  disabled?: boolean
  name?: string
}

export function EntidadCombobox({ entidades, defaultValue, disabled, name = "entidad_id" }: Props) {
  const initial = defaultValue ? entidades.find((e) => e.id === defaultValue) : undefined

  const [query, setQuery]           = useState(initial?.nombre ?? "")
  const [selectedId, setSelectedId] = useState(defaultValue ?? "")
  const [open, setOpen]             = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const inputRef     = useRef<HTMLInputElement>(null)
  const listRef      = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? entidades.filter((e) => e.nombre.toLowerCase().includes(query.toLowerCase()))
    : entidades

  const select = useCallback((e: Entidad) => {
    setSelectedId(e.id)
    setQuery(e.nombre)
    setOpen(false)
  }, [])

  const clear = useCallback(() => {
    setSelectedId(""); setQuery(""); setOpen(false)
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        if (!selectedId) setQuery("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [selectedId])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true)
      return
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]) }
    else if (e.key === "Escape") setOpen(false)
  }

  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement
    item?.scrollIntoView({ block: "nearest" })
  }, [highlighted])

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder="Buscar entidad…"
          autoComplete="off"
          onChange={(e) => { setQuery(e.target.value); setSelectedId(""); setHighlighted(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={[
            "h-8 w-full rounded-lg border px-2.5 pr-8 text-sm",
            "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "bg-background text-foreground placeholder:text-muted-foreground",
            selectedId ? "border-primary/50 bg-primary/5" : "border-input",
          ].join(" ")}
        />
        {(query || selectedId) && !disabled && (
          <button type="button" onClick={clear} tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer">
            ✕
          </button>
        )}
      </div>

      {open && !disabled && (
        <ul ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-background border border-border rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No se encontraron entidades</li>
          ) : (
            filtered.map((e, i) => (
              <li key={e.id}
                onMouseDown={(ev) => { ev.preventDefault(); select(e) }}
                onMouseEnter={() => setHighlighted(i)}
                className={[
                  "px-4 py-2.5 cursor-pointer text-sm transition-colors",
                  i === highlighted ? "bg-muted" : "hover:bg-muted/50",
                  selectedId === e.id ? "font-semibold text-primary" : "text-foreground",
                ].join(" ")}>
                {e.nombre}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
