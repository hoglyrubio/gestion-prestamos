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

interface PrestamoActivo {
  id: string; numero: string; tipo: string
  cuotas: number; cuotas_pagadas: number
  valor_cuota: number; fecha_inicio: string; estado: string
  cliente: { nombres: string; apellidos: string } | null
}
interface PagoHistorial {
  id: string; numero_cuota: number; fecha_pago: string | null
  valor_pagado: number | null; notas: string | null; prestamo_id: string
  prestamo: { numero: string; cliente: { nombres: string; apellidos: string } | null } | null
}
interface StatActivo { cuotas: number; cuotas_pagadas: number; fecha_inicio: string }

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const ESTADO_CLS: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  VENCIDO:   "bg-destructive/10 text-destructive",
  PAGADO:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
}

function proximaFecha(p: { fecha_inicio: string; cuotas_pagadas: number }): string {
  const d = new Date(p.fecha_inicio + "T00:00:00")
  d.setMonth(d.getMonth() + p.cuotas_pagadas)
  return d.toISOString().split("T")[0]
}

function estadoCobro(p: PrestamoActivo | StatActivo): "VENCIDO" | "PENDIENTE" {
  const hoy = new Date().toISOString().split("T")[0]
  return proximaFecha(p) < hoy ? "VENCIDO" : "PENDIENTE"
}

function diasLabel(p: PrestamoActivo): { text: string; cls: string } {
  const fecha = proximaFecha(p)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha + "T00:00:00")
  const dias = Math.round((d.getTime() - hoy.getTime()) / 86_400_000)
  const text = dias === 0 ? "Hoy" : dias > 0 ? `En ${dias}d` : `${Math.abs(dias)}d vencida`
  const cls = dias < 0 ? "text-destructive font-semibold" : dias <= 5 ? "text-amber-600 font-semibold" : "text-muted-foreground"
  return { text, cls }
}

type Tab = "cobrar" | "historial"

export function PagosClient({
  prestamos, historial, statsActivos, recaudoMes, page, totalPages,
}: {
  prestamos: PrestamoActivo[]
  historial: PagoHistorial[]
  statsActivos: StatActivo[]
  recaudoMes: number
  page: number
  totalPages: number
}) {
  const [tab, setTab]           = useState<Tab>("cobrar")
  const [search, setSearch]     = useState("")
  const [detail, setDetail]     = useState<PrestamoActivo | null>(null)
  const [pagoModal, setPagoModal] = useState<PrestamoActivo | null>(null)
  const [histDetail, setHistDetail] = useState<PagoHistorial | null>(null)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [anulError, setAnulError] = useState<string | null>(null)
  const [, startTransition]     = useTransition()

  const hoy = new Date().toISOString().split("T")[0]
  const activos  = statsActivos.length
  const vencidas = statsActivos.filter((p) => proximaFecha(p) < hoy).length

  const filteredPrestamos = prestamos.filter((p) => {
    const q = search.toLowerCase()
    const cliente = p.cliente ? `${p.cliente.nombres} ${p.cliente.apellidos}`.toLowerCase() : ""
    return p.numero.toLowerCase().includes(q) || cliente.includes(q)
  })

  const filteredHistorial = historial.filter((p) => {
    const q = search.toLowerCase()
    const cliente = p.prestamo?.cliente
      ? `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`.toLowerCase() : ""
    return (p.prestamo?.numero ?? "").toLowerCase().includes(q) || cliente.includes(q)
  })

  function handleAnular(pago: PagoHistorial) {
    if (!confirm(`¿Anular el pago de la cuota #${pago.numero_cuota}? Esta acción no se puede deshacer.`)) return
    setAnulando(pago.id); setAnulError(null); setHistDetail(null)
    const fd = new FormData(); fd.set("id", pago.id)
    startTransition(async () => {
      const res = await anularPago({}, fd)
      setAnulando(null)
      if (res.error) setAnulError(res.error)
    })
  }

  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground">Pagos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Registro de cuotas cobradas y seguimiento de cartera</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Recaudo este mes" value={COP(recaudoMes)} sub="Pagos recibidos"   color="green"  />
        <StatCard label="Préstamos activos" value={String(activos)}  sub="En curso"         color="primary" />
        <StatCard label="Cuotas vencidas"  value={String(vencidas)} sub="Sin cobrar"       color="red"    />
        <StatCard label="Cuotas cobradas"  value={String(historial.length)} sub="Historial reciente" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(["cobrar", "historial"] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setSearch("") }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {t === "cobrar" ? "Por cobrar" : "Historial de pagos"}
          </button>
        ))}
        <div className="ml-auto mb-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">🔍</span>
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Número o cliente…" className="pl-9 sm:w-56 h-8 text-sm" />
        </div>
      </div>

      {anulError && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-3">{anulError}</p>
      )}

      {/* Tab: Por cobrar */}
      {tab === "cobrar" && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {["Préstamo / Cliente", "Progreso", "Próx. vencimiento", "Estado"].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrestamos.map((p) => {
                const estado = estadoCobro(p)
                const { text, cls } = diasLabel(p)
                return (
                  <TableRow key={p.id} onClick={() => setDetail(p)} className="cursor-pointer">
                    <TableCell>
                      <p className="font-mono font-semibold text-primary text-sm">{p.numero}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.cliente ? `${p.cliente.nombres} ${p.cliente.apellidos}` : "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      <span className="font-semibold">{p.cuotas_pagadas}</span>
                      <span className="text-muted-foreground">/{p.cuotas}</span>
                    </TableCell>
                    <TableCell className={cn("text-xs", cls)}>{text}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-transparent", ESTADO_CLS[estado])}>
                        {estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredPrestamos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    {search ? "Sin resultados" : "No hay préstamos activos con cuotas pendientes"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="px-4 pb-3"><Pagination page={page} totalPages={totalPages} /></div>
        </div>
      )}

      {/* Tab: Historial */}
      {tab === "historial" && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {["Préstamo / Cliente", "Cuota", "Fecha pago", "Valor pagado"].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistorial.map((p) => (
                <TableRow key={p.id} onClick={() => setHistDetail(p)} className="cursor-pointer">
                  <TableCell>
                    <p className="font-mono font-semibold text-primary text-sm">{p.prestamo?.numero ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.prestamo?.cliente
                        ? `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}` : "—"}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-foreground text-center">#{p.numero_cuota}</TableCell>
                  <TableCell className="text-sm text-foreground">{p.fecha_pago ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium text-green-700 dark:text-green-400">
                    {p.valor_pagado != null ? COP(p.valor_pagado) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredHistorial.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    {search ? "Sin resultados" : "Aún no hay pagos registrados"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet: detalle préstamo (tab cobrar) */}
      {detail && (
        <Sheet
          title={`${detail.numero} — cuota ${detail.cuotas_pagadas + 1}/${detail.cuotas}`}
          onClose={() => setDetail(null)}
        >
          <Field label="Cliente" value={detail.cliente
            ? `${detail.cliente.nombres} ${detail.cliente.apellidos}` : "—"} />
          <Field label="Tipo"    value={detail.tipo} />
          <Field label="Progreso" value={`${detail.cuotas_pagadas} de ${detail.cuotas} cuotas`} />
          <Field label="Valor cuota" value={COP(detail.valor_cuota)} />
          <Field label="Próx. vencimiento" value={proximaFecha(detail)} />
          <Field label="Estado cobro" value={estadoCobro(detail)}
            badge badgeCls={ESTADO_CLS[estadoCobro(detail)]} />
          <Button className="w-full" onClick={() => { setDetail(null); setPagoModal(detail) }}>
            Registrar pago
          </Button>
        </Sheet>
      )}

      {/* Sheet: detalle pago (tab historial) */}
      {histDetail && (
        <Sheet
          title={`Pago cuota #${histDetail.numero_cuota} — ${histDetail.prestamo?.numero ?? ""}`}
          onClose={() => setHistDetail(null)}
        >
          <Field label="Cliente" value={histDetail.prestamo?.cliente
            ? `${histDetail.prestamo.cliente.nombres} ${histDetail.prestamo.cliente.apellidos}` : "—"} />
          <Field label="Cuota"       value={`#${histDetail.numero_cuota}`} />
          <Field label="Fecha pago"  value={histDetail.fecha_pago} />
          <Field label="Valor pagado" value={histDetail.valor_pagado != null ? COP(histDetail.valor_pagado) : "—"} />
          {histDetail.notas && <Field label="Notas" value={histDetail.notas} />}
          <Button variant="outline" className="w-full"
            disabled={anulando === histDetail.id}
            onClick={() => handleAnular(histDetail)}>
            {anulando === histDetail.id ? "Anulando…" : "Anular pago"}
          </Button>
        </Sheet>
      )}

      {/* Modal: formulario de pago */}
      {pagoModal && (
        <Modal
          title={`Registrar pago — ${pagoModal.numero} cuota #${pagoModal.cuotas_pagadas + 1}`}
          onClose={() => setPagoModal(null)}
        >
          <PagoForm prestamo={pagoModal} onClose={() => setPagoModal(null)} />
        </Modal>
      )}
    </>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  const cls = color === "primary" ? "text-primary"
    : color === "green"   ? "text-green-600 dark:text-green-400"
    : color === "red"     ? "text-destructive"
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
