"use client"

import { useState, useTransition } from "react"
import { PagoForm } from "./pago-form"
import { anularPago } from "@/actions/pagos"
import { Pagination } from "@/components/ui/pagination"
import { Sheet, Modal, Field } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Pago {
  id: string; numero_cuota: number; fecha_esperada: string
  valor_esperado: number; fecha_pago: string | null; valor_pagado: number | null
  notas: string | null; estado: string; prestamo_id: string
  prestamo: { numero: string; cliente: { nombres: string; apellidos: string } | null } | null
}
interface StatPago {
  estado: string; fecha_pago: string | null; valor_pagado: number | null; fecha_esperada: string
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const FILTROS = ["Todos", "PENDIENTE", "VENCIDO", "PAGADO"] as const
type Filtro = typeof FILTROS[number]

function estadoEfectivo(pago: { estado: string; fecha_esperada: string }): "PENDIENTE" | "VENCIDO" | "PAGADO" {
  if (pago.estado === "PAGADO") return "PAGADO"
  return pago.fecha_esperada < new Date().toISOString().split("T")[0] ? "VENCIDO" : "PENDIENTE"
}

const ESTADO_CLS: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  VENCIDO:   "bg-destructive/10 text-destructive",
  PAGADO:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
}

function diasLabel(pago: Pago & { _estado: string }): { text: string; cls: string } {
  if (pago._estado === "PAGADO") return { text: pago.fecha_pago ?? "—", cls: "text-muted-foreground" }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(pago.fecha_esperada + "T00:00:00")
  const dias = Math.round((d.getTime() - hoy.getTime()) / 86_400_000)
  const text = dias === 0 ? "Hoy" : dias > 0 ? `En ${dias}d` : `${Math.abs(dias)}d vencida`
  const cls = dias < 0 ? "text-destructive font-semibold" : dias <= 5 ? "text-amber-600 font-semibold" : "text-muted-foreground"
  return { text, cls }
}

export function PagosClient({
  pagos, stats, page, totalPages,
}: { pagos: Pago[]; stats: StatPago[]; page: number; totalPages: number }) {
  const [filtro, setFiltro]       = useState<Filtro>("Todos")
  const [search, setSearch]       = useState("")
  const [detail, setDetail]       = useState<(Pago & { _estado: string }) | null>(null)
  const [pagoModal, setPagoModal] = useState<Pago | null>(null)
  const [anulando, setAnulando]   = useState<string | null>(null)
  const [, startTransition]       = useTransition()

  const pagosConEstado = pagos.map((p) => ({ ...p, _estado: estadoEfectivo(p) }))

  const filtered = pagosConEstado.filter((p) => {
    const matchFiltro = filtro === "Todos" || p._estado === filtro
    const q = search.toLowerCase()
    const cliente = p.prestamo?.cliente
      ? `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`.toLowerCase() : ""
    return matchFiltro && (p.prestamo?.numero.toLowerCase().includes(q) || cliente.includes(q))
  })

  const hoy = new Date().toISOString().split("T")[0]
  const mes = hoy.slice(0, 7)
  const statsEfectivos = stats.map((p) => ({ ...p, _estado: estadoEfectivo(p) }))
  const pendientes = statsEfectivos.filter((p) => p._estado === "PENDIENTE").length
  const vencidas   = statsEfectivos.filter((p) => p._estado === "VENCIDO").length
  const pagadas    = statsEfectivos.filter((p) => p._estado === "PAGADO").length
  const recaudoMes = stats.filter((p) => p.fecha_pago?.startsWith(mes)).reduce((s, p) => s + (p.valor_pagado ?? 0), 0)

  function handleAnular(pago: Pago) {
    if (!confirm(`¿Anular el pago de la cuota #${pago.numero_cuota}? Volverá a PENDIENTE.`)) return
    setAnulando(pago.id); setDetail(null)
    const fd = new FormData(); fd.set("id", pago.id)
    startTransition(async () => { await anularPago({}, fd); setAnulando(null) })
  }

  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground">Pagos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Seguimiento de cuotas por cobrar y recaudadas</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Recaudo este mes" value={COP(recaudoMes)} sub="Pagos recibidos"    color="green" />
        <StatCard label="Pendientes"       value={String(pendientes)} sub="Por vencer"      color="amber" />
        <StatCard label="Vencidas"         value={String(vencidas)}   sub="Sin pago"        color="red"   />
        <StatCard label="Pagadas"          value={String(pagadas)}    sub="Total histórico" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {FILTROS.map((f) => (
            <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"}
              onClick={() => setFiltro(f)} className="whitespace-nowrap text-xs">
              {f}
            </Button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">🔍</span>
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Número o cliente…" className="pl-9 sm:w-60" />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {["Préstamo / Cliente", "Cuota", "Vence", "Estado"].map((h) => (
                <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const { text, cls } = diasLabel(p)
              return (
                <TableRow key={p.id} onClick={() => setDetail(p)} className="cursor-pointer">
                  <TableCell>
                    <p className="font-mono font-semibold text-primary text-sm">{p.prestamo?.numero ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.prestamo?.cliente
                        ? `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}` : "—"}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-foreground text-center">#{p.numero_cuota}</TableCell>
                  <TableCell className={cn("text-xs", cls)}>{text}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-transparent", ESTADO_CLS[p._estado])}>
                      {p._estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  No hay cuotas con ese criterio
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-3"><Pagination page={page} totalPages={totalPages} /></div>
      </div>

      {detail && (
        <Sheet title={`Cuota #${detail.numero_cuota} — ${detail.prestamo?.numero ?? ""}`} onClose={() => setDetail(null)}>
          <Field label="Cliente"        value={detail.prestamo?.cliente
            ? `${detail.prestamo.cliente.nombres} ${detail.prestamo.cliente.apellidos}` : "—"} />
          <Field label="Estado"         value={detail._estado} badge badgeCls={ESTADO_CLS[detail._estado]} />
          <Field label="Fecha esperada" value={detail.fecha_esperada} />
          <Field label="Valor esperado" value={COP(detail.valor_esperado)} />
          {detail._estado === "PAGADO" && <>
            <Field label="Fecha de pago" value={detail.fecha_pago} />
            <Field label="Valor pagado"  value={detail.valor_pagado != null ? COP(detail.valor_pagado) : "—"} />
            {detail.notas && <Field label="Notas" value={detail.notas} />}
          </>}
          {detail._estado !== "PAGADO" ? (
            <Button className="w-full" onClick={() => { setDetail(null); setPagoModal(detail) }}>
              Registrar pago
            </Button>
          ) : (
            <Button variant="outline" className="w-full"
              disabled={anulando === detail.id}
              onClick={() => handleAnular(detail)}>
              {anulando === detail.id ? "Anulando…" : "Anular pago"}
            </Button>
          )}
        </Sheet>
      )}

      {pagoModal && (
        <Modal title={`Registrar pago — Cuota #${pagoModal.numero_cuota}`} onClose={() => setPagoModal(null)}>
          <PagoForm
            pago={{
              ...pagoModal,
              prestamo: pagoModal.prestamo ?? { numero: "—" },
              cliente: pagoModal.prestamo?.cliente ?? { nombres: "—", apellidos: "" },
            }}
            onClose={() => setPagoModal(null)}
          />
        </Modal>
      )}
    </>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  const cls = color === "green" ? "text-green-600 dark:text-green-400"
    : color === "amber" ? "text-amber-600 dark:text-amber-400"
    : color === "red"   ? "text-destructive"
    : "text-foreground"
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold mt-1 leading-tight", cls)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}
