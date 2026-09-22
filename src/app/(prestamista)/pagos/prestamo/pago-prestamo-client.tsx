"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { anularPago } from "@/actions/pagos"
import { Modal } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { PagoForm } from "../pago-form"

interface PrestamoResumen {
  id: string
  numero: string
  tipo: string
  cuotas: number
  cuotas_pagadas: number
  valor_cuota: number
  total_pagado: number
  fecha_inicio: string
  cliente: { nombre: string } | null
}

interface PagoRow {
  id: string
  numero_cuota: number
  fecha_pago: string | null
  valor_pagado: number | null
  notas: string | null
  ingresado_nombre: string | null
  created_at: string
}

interface PrestamoDetalle extends PrestamoResumen {
  capital: number
  tasa_interes: number
  fecha: string
  entidad: { nombre: string } | null
  pagos: PagoRow[]
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const TIPO_CLS: Record<string, string> = {
  LIBRANZA: "bg-primary/10 text-primary",
  PERSONAL: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
}

function proximaFecha(p: { fecha_inicio: string; cuotas_pagadas: number }): string {
  const d = new Date(p.fecha_inicio + "T00:00:00")
  d.setMonth(d.getMonth() + p.cuotas_pagadas)
  return d.toISOString().split("T")[0]
}

function diasInfo(p: PrestamoResumen): { text: string; cls: string } {
  const fecha = proximaFecha(p)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha + "T00:00:00")
  const dias = Math.round((d.getTime() - hoy.getTime()) / 86_400_000)
  const text = dias === 0 ? "Hoy" : dias > 0 ? `En ${dias}d` : `${Math.abs(dias)}d vencida`
  const cls = dias < 0 ? "text-destructive text-xs font-semibold"
    : dias <= 5 ? "text-amber-600 text-xs font-semibold"
    : "text-muted-foreground text-xs"
  return { text, cls }
}

export function PagoPrestamo({
  prestamos,
  selected,
  prestamoId,
}: {
  prestamos: PrestamoResumen[]
  selected: PrestamoDetalle | null
  prestamoId: string | null
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [pagoModal, setPagoModal] = useState(false)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [anulError, setAnulError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const filtered = prestamos.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.numero.toLowerCase().includes(q) ||
      (p.cliente?.nombre ?? "").toLowerCase().includes(q)
    )
  })

  function selectPrestamo(id: string) {
    router.push(`?prestamo_id=${id}`)
  }

  function handleAnular(pago: PagoRow) {
    if (!confirm(`¿Anular el pago de la cuota #${pago.numero_cuota}? Esta acción no se puede deshacer.`)) return
    setAnulando(pago.id); setAnulError(null)
    const fd = new FormData(); fd.set("id", pago.id)
    startTransition(async () => {
      const res = await anularPago({}, fd)
      setAnulando(null)
      if (res.error) setAnulError(res.error)
    })
  }

  const saldo = selected
    ? selected.cuotas * selected.valor_cuota - (selected.total_pagado ?? 0)
    : 0

  const showDetail = !!selected
  const showList = !showDetail // mobile: only one panel at a time

  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground">Pago a Préstamo</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Registra y consulta pagos por préstamo activo</p>
      </div>

      <div className="flex gap-4 min-h-[60vh]">
        {/* Panel izquierdo: lista */}
        <div className={cn(
          "w-full lg:w-80 flex-shrink-0 flex flex-col gap-2",
          showDetail ? "hidden lg:flex" : "flex"
        )}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">🔍</span>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Número o cliente…"
              className="pl-9"
            />
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {search ? "Sin resultados" : "No hay préstamos activos"}
              </p>
            )}
            {filtered.map((p) => {
              const { text, cls } = diasInfo(p)
              const isSelected = p.id === prestamoId
              return (
                <button
                  key={p.id}
                  onClick={() => selectPrestamo(p.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors hover:bg-muted/60",
                    isSelected ? "bg-primary/8" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn("font-mono font-semibold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                        {p.numero}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {p.cliente?.nombre ?? "—"}
                      </p>
                    </div>
                    <span className={cls}>{text}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (p.cuotas_pagadas / p.cuotas) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {p.cuotas_pagadas}/{p.cuotas}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel derecho: detalle */}
        <div className={cn(
          "flex-1 min-w-0",
          showDetail ? "block" : "hidden lg:flex items-center justify-center"
        )}>
          {!selected ? (
            <p className="text-muted-foreground text-sm">Selecciona un préstamo de la lista</p>
          ) : (
            <div className="space-y-4">
              {/* Botón volver (móvil) */}
              <button
                className="lg:hidden text-sm text-primary flex items-center gap-1"
                onClick={() => router.push("?")}
              >
                ← Volver
              </button>

              {/* Header del prestamo */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-bold text-foreground">{selected.numero}</p>
                  <p className="text-sm text-muted-foreground">{selected.cliente?.nombre ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("border-transparent", TIPO_CLS[selected.tipo] ?? "bg-secondary text-secondary-foreground")}>
                    {selected.tipo}
                  </Badge>
                  <Button size="sm" onClick={() => setPagoModal(true)}>
                    + Registrar pago
                  </Button>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card size="sm">
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Capital</p>
                    <p className="text-base font-bold text-foreground mt-0.5">{COP(selected.capital)}</p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Cuotas</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {selected.cuotas_pagadas}
                      <span className="text-muted-foreground font-normal">/{selected.cuotas}</span>
                    </p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Total pagado</p>
                    <p className="text-base font-bold text-green-700 dark:text-green-400 mt-0.5">
                      {COP(selected.total_pagado ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                    <p className={cn("text-base font-bold mt-0.5", saldo > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                      {COP(Math.max(0, saldo))}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detalles del préstamo */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Fecha", selected.fecha],
                  ["Inicio cuotas", selected.fecha_inicio],
                  ["Tasa de interés", `${selected.tasa_interes}% mensual`],
                  ["Valor cuota", COP(selected.valor_cuota)],
                  ["N.º cuotas", String(selected.cuotas)],
                  ...(selected.entidad ? [["Entidad", selected.entidad.nombre]] : []),
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-medium text-foreground">{v}</p>
                  </div>
                ))}
              </div>

              {/* Progreso */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (selected.cuotas_pagadas / selected.cuotas) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {Math.round((selected.cuotas_pagadas / selected.cuotas) * 100)}%
                </span>
              </div>

              {anulError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{anulError}</p>
              )}

              {/* Tabla de pagos */}
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      {["#", "Fecha pago", "Valor", "Notas", "Ingresado por", "Registrado", ""].map((h) => (
                        <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.pagos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                          Aún no hay pagos registrados para este préstamo
                        </TableCell>
                      </TableRow>
                    ) : (
                      selected.pagos.map((pago, idx) => (
                        <TableRow key={pago.id}>
                          <TableCell className="font-mono font-semibold text-primary">#{pago.numero_cuota}</TableCell>
                          <TableCell className="text-sm text-foreground">{pago.fecha_pago ?? "—"}</TableCell>
                          <TableCell className="text-sm font-medium text-green-700 dark:text-green-400">
                            {pago.valor_pagado != null ? COP(pago.valor_pagado) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                            {pago.notas ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {pago.ingresado_nombre ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(pago.created_at).toLocaleDateString("es-CO")}
                          </TableCell>
                          <TableCell>
                            {idx === selected.pagos.length - 1 && (
                              <button
                                disabled={anulando === pago.id}
                                onClick={() => handleAnular(pago)}
                                className="text-xs text-destructive hover:underline disabled:opacity-50"
                              >
                                {anulando === pago.id ? "…" : "Anular"}
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {pagoModal && selected && (
        <Modal
          title={`Registrar pago — ${selected.numero} cuota #${selected.cuotas_pagadas + 1}`}
          onClose={() => setPagoModal(false)}
        >
          <PagoForm
            prestamo={selected}
            onClose={() => setPagoModal(false)}
          />
        </Modal>
      )}
    </>
  )
}
