"use client"

import { useState } from "react"
import { PrestamoForm } from "./prestamo-form"
import { Pagination } from "@/components/ui/pagination"
import { Sheet, Modal, Field } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Cliente { id: string; nombres: string; apellidos: string; documento: string }
interface Entidad { id: string; nombre: string }
interface Adjunto { id: string; url: string; nombre: string }
interface Prestamo {
  id: string; tipo: string; numero: string; cliente_id: string; entidad_id: string | null
  fecha: string; fecha_inicio: string; capital: number; tasa_interes: number
  cuotas: number; valor_cuota: number; estado: string
  cliente: { nombres: string; apellidos: string } | null
  entidad: { nombre: string } | null
  adjuntos: Adjunto[]
}

function isImage(url: string) {
  try { return /\.(jpg|jpeg|png|gif|webp)$/i.test(new URL(url).pathname) }
  catch { return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) }
}

function AdjuntoPreview({ adjunto, onClose }: { adjunto: Adjunto; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/85 z-[60] flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black/40"
        onClick={(e) => e.stopPropagation()}>
        <p className="text-white text-sm truncate flex-1 mr-4">{adjunto.nombre}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={adjunto.url} download={adjunto.nombre} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-lg transition">
            ⬇ Descargar
          </a>
          <button onClick={onClose}
            className="flex items-center justify-center w-8 h-8 bg-white/15 hover:bg-white/25 text-white rounded-lg transition text-sm">
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 min-h-0"
        onClick={(e) => e.stopPropagation()}>
        {isImage(adjunto.url) ? (
          <img src={adjunto.url} alt={adjunto.nombre}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        ) : (
          <iframe src={adjunto.url} title={adjunto.nombre}
            className="w-full h-full rounded-lg bg-white" />
        )}
      </div>
    </div>
  )
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const ESTADO_CLS: Record<string, string> = {
  ACTIVA:  "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  PAGADA:  "bg-secondary text-secondary-foreground",
  ANULADA: "bg-destructive/10 text-destructive",
}
const TIPO_CLS: Record<string, string> = {
  LIBRANZA: "bg-primary/10 text-primary",
  PERSONAL: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
}
const FILTROS = ["Todos", "ACTIVA", "PAGADA", "ANULADA"] as const

export function PrestamosClient({
  prestamos, clientes, entidades, stats, page, totalPages,
}: {
  prestamos: Prestamo[]; clientes: Cliente[]; entidades: Entidad[]
  stats: Pick<Prestamo, "estado" | "capital" | "valor_cuota">[]
  page: number; totalPages: number
}) {
  const [detail, setDetail]       = useState<Prestamo | null>(null)
  const [formPrestamo, setForm]   = useState<Prestamo | null | "new">(null)
  const [preview, setPreview]     = useState<Adjunto | null>(null)
  const [filtro, setFiltro]     = useState("Todos")
  const [search, setSearch]     = useState("")

  const filtered = prestamos.filter((p) => {
    const matchFiltro = filtro === "Todos" || p.estado === filtro
    const q = search.toLowerCase()
    return matchFiltro && (
      p.numero.toLowerCase().includes(q) ||
      (p.cliente?.nombres + " " + p.cliente?.apellidos).toLowerCase().includes(q)
    )
  })

  const activos = stats.filter((p) => p.estado === "ACTIVA")
  const capitalColocado = activos.reduce((s, p) => s + p.capital, 0)
  const porCobrar = activos.reduce((s, p) => s + p.valor_cuota, 0)

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Préstamos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión de préstamos activos e historial</p>
        </div>
        <Button onClick={() => setForm("new")}>+ Nuevo préstamo</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Capital colocado" value={COP(capitalColocado)} sub="Activos"        color="primary" />
        <StatCard label="Activos"          value={String(activos.length)} sub="En curso"     color="green" />
        <StatCard label="Por cobrar / mes" value={COP(porCobrar)}        sub="Cuotas activas" color="amber" />
        <StatCard label="Total"            value={String(stats.length)}   sub="Todos los estados" />
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
              {["Número", "Cliente", "Capital", "Estado"].map((h) => (
                <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} onClick={() => setDetail(p)} className="cursor-pointer">
                <TableCell className="font-mono font-semibold text-primary">{p.numero}</TableCell>
                <TableCell className="text-foreground">
                  {p.cliente ? `${p.cliente.nombres} ${p.cliente.apellidos}` : "—"}
                </TableCell>
                <TableCell className="text-foreground">{COP(p.capital)}</TableCell>
                <TableCell>
                  <Badge className={cn("border-transparent", ESTADO_CLS[p.estado] ?? "bg-secondary text-secondary-foreground")}>
                    {p.estado}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  {search || filtro !== "Todos" ? "Sin resultados" : (
                    <><button onClick={() => setForm("new")} className="text-primary underline">Crear el primer préstamo</button></>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-3"><Pagination page={page} totalPages={totalPages} /></div>
      </div>

      {detail && (() => {
        const estadoCls = ESTADO_CLS[detail.estado] ?? "bg-secondary text-secondary-foreground"
        return (
          <Sheet title={detail.numero} onClose={() => setDetail(null)}>
            <Field label="Cliente"     value={detail.cliente ? `${detail.cliente.nombres} ${detail.cliente.apellidos}` : "—"} />
            <Field label="Tipo"        value={detail.tipo} badge badgeCls={TIPO_CLS[detail.tipo]} />
            {detail.entidad && <Field label="Entidad" value={detail.entidad.nombre} />}
            <Field label="Estado"      value={detail.estado} badge badgeCls={estadoCls} />
            <Field label="Capital"     value={COP(detail.capital)} />
            <Field label="Tasa"        value={`${detail.tasa_interes}% mensual`} />
            <Field label="Cuotas"      value={String(detail.cuotas)} />
            <Field label="Valor cuota" value={COP(detail.valor_cuota)} />
            <Field label="Fecha"       value={detail.fecha} />
            <Field label="Inicio"      value={detail.fecha_inicio} />
            {detail.adjuntos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Adjuntos ({detail.adjuntos.length})
                </p>
                <div className="space-y-1.5">
                  {detail.adjuntos.map((a) => (
                    <button key={a.id} type="button" onClick={() => setPreview(a)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 border border-border bg-muted/50 hover:bg-muted rounded-lg transition text-left">
                      <span className="text-base flex-shrink-0">{isImage(a.url) ? "🖼️" : "📄"}</span>
                      <span className="text-sm text-foreground flex-1 truncate">{a.nombre}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={() => { setDetail(null); setForm(detail) }}>
              Editar préstamo
            </Button>
          </Sheet>
        )
      })()}

      {formPrestamo !== null && (
        <Modal
          title={formPrestamo === "new" ? "Nuevo préstamo" : `Editar ${(formPrestamo as Prestamo).numero}`}
          onClose={() => setForm(null)} wide
        >
          <PrestamoForm
            prestamo={formPrestamo === "new" ? undefined : formPrestamo as Prestamo}
            clientes={clientes}
            entidades={entidades}
            onClose={() => setForm(null)}
          />
        </Modal>
      )}

      {preview && <AdjuntoPreview adjunto={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  const cls = color === "primary" ? "text-primary" : color === "green" ? "text-green-600 dark:text-green-400"
    : color === "amber" ? "text-amber-600 dark:text-amber-400" : "text-foreground"
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
