"use client"

import { useState, useTransition, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { procesarBulkPago, type AplicacionResuelta, type LineaResuelta } from "@/actions/bulk-pagos"
import { Modal } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Template { id: string; nombre: string; template: string }

interface ClienteInfo { id: string; documento: string; nombre: string }
interface PrestamoInfo {
  id: string; numero: string; valor_cuota: number
  cuotas: number; cuotas_pagadas: number; cliente_id: string
}

type RowStatus =
  | { type: "ok"; distribuciones: AplicacionResuelta[][]; seleccionada: number }
  | { type: "ambigua"; distribuciones: AplicacionResuelta[][]; seleccionada: number }
  | { type: "error"; msg: string }

interface RowPreview {
  fila: number
  datos: Record<string, string>
  nit: string
  fechaPago: string
  valor: number
  clienteId: string | null
  clienteNombre: string | null
  status: RowStatus
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toCents(v: number) { return Math.round(v * 100) }

function findDistributions(
  valorCents: number,
  prestamos: PrestamoInfo[],
  idx = 0,
  current: AplicacionResuelta[] = [],
  results: AplicacionResuelta[][] = []
): AplicacionResuelta[][] {
  if (valorCents === 0) {
    if (current.length > 0) results.push([...current])
    return results
  }
  if (valorCents < 0 || idx >= prestamos.length || results.length >= 10) return results

  const p = prestamos[idx]
  const pendientes = p.cuotas - p.cuotas_pagadas
  const cuotaCents = toCents(p.valor_cuota)

  if (pendientes <= 0 || cuotaCents <= 0) {
    return findDistributions(valorCents, prestamos, idx + 1, current, results)
  }

  const maxN = Math.min(pendientes, Math.floor(valorCents / cuotaCents))

  for (let n = maxN; n >= 0; n--) {
    if (n > 0) {
      current.push({ prestamo_id: p.id, numero: p.numero, cuotas_count: n, valor: n * p.valor_cuota })
    }
    findDistributions(valorCents - n * cuotaCents, prestamos, idx + 1, current, results)
    if (n > 0) current.pop()
    if (results.length >= 10) return results
  }
  return results
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let field = ""; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { field += '"'; i++ }
      else inQ = !inQ
    } else if (c === "," && !inQ) {
      result.push(field.trim()); field = ""
    } else {
      field += c
    }
  }
  result.push(field.trim())
  return result
}

function parseValor(s: string): number {
  const clean = s.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".")
  return parseFloat(clean)
}

function parseFechaPago(s: string): string | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

function describeDistribucion(d: AplicacionResuelta[]): string {
  return d.map((a) =>
    `${a.numero} ×${a.cuotas_count} cuota${a.cuotas_count > 1 ? "s" : ""}`
  ).join(" + ")
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const selectCls = "h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"

// ── Componente ───────────────────────────────────────────────────────────────

export function NuevoBulkModal({
  templates, onClose, onSuccess,
}: {
  templates: Template[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep]               = useState<"form" | "preview">("form")
  const [templateId, setTemplateId]   = useState(templates[0]?.id ?? "")
  const [file, setFile]               = useState<File | null>(null)
  const [rows, setRows]               = useState<RowPreview[]>([])
  const [headers, setHeaders]         = useState<string[]>([])
  const [loading, setLoading]         = useState(false)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [, startTransition]           = useTransition()

  // ── Paso 1 → 2: cargar y resolver el CSV ──────────────────────────────────

  const handleContinuar = useCallback(async () => {
    if (!file || !templateId) return
    setLoading(true); setLoadError(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) { setLoadError("El archivo está vacío o solo tiene cabecera"); setLoading(false); return }

      const headerLine = parseCSVLine(lines[0])
      setHeaders(headerLine)

      // Cargar clientes y préstamos activos desde supabase
      const supabase = createClient()
      const [{ data: clientes }, { data: prestamos }] = await Promise.all([
        supabase.from("clientes").select("id, documento, nombre"),
        supabase.from("prestamos")
          .select("id, numero, valor_cuota, cuotas, cuotas_pagadas, cliente_id")
          .eq("estado", "ACTIVA"),
      ])

      const clienteMap = new Map<string, ClienteInfo>()
      for (const c of clientes ?? []) clienteMap.set(c.documento, c)

      const prestamosByCliente = new Map<string, PrestamoInfo[]>()
      for (const p of prestamos ?? []) {
        const arr = prestamosByCliente.get(p.cliente_id) ?? []
        arr.push(p)
        prestamosByCliente.set(p.cliente_id, arr)
      }

      const nitIdx    = headerLine.indexOf("nit")
      const valorIdx  = headerLine.indexOf("valor")
      const fechaIdx  = headerLine.indexOf("fecha_pago")

      if (nitIdx < 0 || valorIdx < 0 || fechaIdx < 0) {
        setLoadError("El archivo no tiene las columnas requeridas: nit, valor, fecha_pago")
        setLoading(false); return
      }

      const resolved: RowPreview[] = []

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.every((c) => !c)) continue

        const datos: Record<string, string> = {}
        headerLine.forEach((h, idx) => { datos[h] = cols[idx] ?? "" })

        const nit       = cols[nitIdx] ?? ""
        const valorStr  = cols[valorIdx] ?? ""
        const fechaStr  = cols[fechaIdx] ?? ""
        const valor     = parseValor(valorStr)
        const fechaPago = parseFechaPago(fechaStr)

        // Validaciones básicas
        if (!nit) {
          resolved.push({ fila: i, datos, nit, fechaPago: fechaStr, valor, clienteId: null, clienteNombre: null, status: { type: "error", msg: "NIT vacío" } })
          continue
        }
        if (!fechaPago) {
          resolved.push({ fila: i, datos, nit, fechaPago: fechaStr, valor, clienteId: null, clienteNombre: null, status: { type: "error", msg: `Fecha inválida: "${fechaStr}"` } })
          continue
        }
        if (isNaN(valor) || valor <= 0) {
          resolved.push({ fila: i, datos, nit, fechaPago: fechaStr, valor, clienteId: null, clienteNombre: null, status: { type: "error", msg: `Valor inválido: "${valorStr}"` } })
          continue
        }

        // Buscar cliente
        const cliente = clienteMap.get(nit)
        if (!cliente) {
          resolved.push({ fila: i, datos, nit, fechaPago, valor, clienteId: null, clienteNombre: null, status: { type: "error", msg: `Cliente no encontrado (NIT: ${nit})` } })
          continue
        }

        // Buscar distribuciones
        const pClienteActivos = prestamosByCliente.get(cliente.id) ?? []
        if (!pClienteActivos.length) {
          resolved.push({ fila: i, datos, nit, fechaPago, valor, clienteId: cliente.id, clienteNombre: cliente.nombre, status: { type: "error", msg: "No tiene préstamos activos" } })
          continue
        }

        const distribuciones = findDistributions(toCents(valor), pClienteActivos)

        if (distribuciones.length === 0) {
          resolved.push({ fila: i, datos, nit, fechaPago, valor, clienteId: cliente.id, clienteNombre: cliente.nombre, status: { type: "error", msg: `Valor ${COP(valor)} no corresponde a ninguna combinación de cuotas activas` } })
        } else if (distribuciones.length === 1) {
          resolved.push({ fila: i, datos, nit, fechaPago, valor, clienteId: cliente.id, clienteNombre: cliente.nombre, status: { type: "ok", distribuciones, seleccionada: 0 } })
        } else {
          resolved.push({ fila: i, datos, nit, fechaPago, valor, clienteId: cliente.id, clienteNombre: cliente.nombre, status: { type: "ambigua", distribuciones, seleccionada: 0 } })
        }
      }

      setRows(resolved)
      setStep("preview")
    } catch (e) {
      setLoadError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [file, templateId])

  // ── Cambiar selección en fila ambigua ─────────────────────────────────────

  function setSeleccion(fila: number, idx: number) {
    setRows((prev) => prev.map((r) =>
      r.fila === fila && (r.status.type === "ambigua" || r.status.type === "ok")
        ? { ...r, status: { ...r.status, seleccionada: idx } }
        : r
    ))
  }

  // ── Aceptar ───────────────────────────────────────────────────────────────

  const errores = rows.filter((r) => r.status.type === "error").length
  const pendientesEleccion = rows.filter(
    (r) => r.status.type === "ambigua"
  ).length
  const puedeAceptar = errores === 0 && pendientesEleccion === 0

  function handleAceptar() {
    setSubmitError(null)
    const lineas: LineaResuelta[] = rows
      .filter((r) => r.status.type === "ok" || r.status.type === "ambigua")
      .map((r) => {
        const st = r.status as { distribuciones: AplicacionResuelta[][]; seleccionada: number }
        return {
          fila: r.fila,
          nit: r.nit,
          cliente_id: r.clienteId!,
          cliente_nombre: r.clienteNombre!,
          fecha_pago: r.fechaPago,
          aplicaciones: st.distribuciones[st.seleccionada],
          datos_fila: r.datos,
        }
      })

    startTransition(async () => {
      const result = await procesarBulkPago(templateId, file!.name, lineas)
      if ("error" in result) {
        setSubmitError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === "form") {
    return (
      <Modal title="Nuevo pago en lote" onClose={onClose}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Template <span className="text-destructive">*</span></Label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={selectCls}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {templateId && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Columnas del template
              </p>
              <p className="text-xs font-mono bg-muted/50 rounded-lg px-3 py-2 text-foreground break-all">
                {templates.find((t) => t.id === templateId)?.template}
              </p>
              <button
                type="button"
                onClick={() => {
                  const t = templates.find((t) => t.id === templateId)
                  if (!t) return
                  const blob = new Blob([t.template + "\n"], { type: "text/csv" })
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
                  a.download = `plantilla_${t.nombre.replace(/\s+/g, "_")}.csv`
                  a.click()
                }}
                className="text-xs text-primary hover:underline"
              >
                ⬇ Descargar plantilla
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Archivo CSV <span className="text-destructive">*</span></Label>
            <label className={[
              "flex flex-col items-center justify-center gap-1.5 px-4 py-6",
              "border-2 border-dashed border-input rounded-lg cursor-pointer",
              "hover:border-ring hover:bg-muted/30 transition text-center",
            ].join(" ")}>
              <span className="text-2xl">{file ? "📄" : "⬆"}</span>
              <span className="text-sm text-foreground font-medium">
                {file ? file.name : "Seleccionar archivo"}
              </span>
              <span className="text-xs text-muted-foreground">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "CSV hasta 5 MB"}
              </span>
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {loadError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{loadError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={!file || !templateId || loading} onClick={handleContinuar}>
              {loading ? "Cargando…" : "Continuar →"}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Paso 2: Preview ───────────────────────────────────────────────────────

  const contOk      = rows.filter((r) => r.status.type === "ok").length
  const contAmbigua = rows.filter((r) => r.status.type === "ambigua").length
  const contError   = rows.filter((r) => r.status.type === "error").length

  return (
    <Modal title={`Preview — ${file?.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Resumen */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Listas", val: contOk,      cls: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
            { label: "Ambiguas", val: contAmbigua, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
            { label: "Errores", val: contError,   cls: "bg-destructive/10 text-destructive" },
          ].map(({ label, val, cls }) => (
            <div key={label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${cls}`}>
              {label}: {val}
            </div>
          ))}
        </div>

        {contAmbigua > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
            🔶 Hay {contAmbigua} fila{contAmbigua > 1 ? "s" : ""} con distribución ambigua. Elige una opción en la columna Status para poder continuar.
          </p>
        )}

        {/* Tabla con scroll horizontal */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">#</th>
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[260px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.fila} className="hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">{row.fila}</td>
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[120px] truncate">
                      {row.datos[h] ?? ""}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <StatusCell row={row} onSelect={(idx) => setSeleccion(row.fila, idx)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {submitError && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{submitError}</p>
        )}

        <div className="flex justify-between gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={() => setStep("form")}>← Volver</Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={!puedeAceptar} onClick={handleAceptar}>
              {!puedeAceptar
                ? errores > 0 ? `${errores} error${errores > 1 ? "es" : ""} pendiente${errores > 1 ? "s" : ""}`
                  : `${pendientesEleccion} sin resolver`
                : `Aplicar ${rows.filter((r) => r.status.type !== "error").length} pagos`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Celda de status ───────────────────────────────────────────────────────────

function StatusCell({ row, onSelect }: { row: RowPreview; onSelect: (idx: number) => void }) {
  const { status } = row

  if (status.type === "error") {
    return (
      <span className="text-destructive font-medium">❌ {status.msg}</span>
    )
  }

  if (status.type === "ok") {
    return (
      <span className="text-green-700 dark:text-green-400 font-medium">
        ✅ {describeDistribucion(status.distribuciones[0])}
      </span>
    )
  }

  // Ambigua
  return (
    <div className="space-y-1">
      <p className="text-amber-600 dark:text-amber-400 font-medium text-[10px]">🔶 Varias opciones — elige:</p>
      <select
        value={status.seleccionada}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="h-7 w-full rounded border border-input bg-background px-1.5 text-xs focus:outline-none focus:border-ring"
      >
        {status.distribuciones.map((d, i) => (
          <option key={i} value={i}>{describeDistribucion(d)}</option>
        ))}
      </select>
    </div>
  )
}
