"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Aplicacion {
  prestamo_id: string
  numero: string
  cuotas_count: number
  cuotas_aplicadas: number[]
  valor: number
}

interface Linea {
  id: string
  fila: number
  nit: string | null
  cliente_nombre: string | null
  status: string
  aplicaciones: Aplicacion[] | null
  datos_fila: Record<string, string> | null
}

interface BulkPago {
  id: string
  created_at: string
  archivo_nombre: string
  usuario_nombre: string
  total_filas: number
  total_pagado: number
  template: { nombre: string } | null
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const STATUS_CLS: Record<string, string> = {
  APLICADO: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  ERROR:    "bg-destructive/10 text-destructive",
}

export function DetailClient({ bulkPago, lineas }: { bulkPago: BulkPago; lineas: Linea[] }) {
  const aplicadas = lineas.filter((l) => l.status === "APLICADO").length
  const errores   = lineas.filter((l) => l.status === "ERROR").length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/pagos/bulk" className="text-sm text-primary hover:underline">← Pagos en lote</Link>
          </div>
          <h2 className="text-xl font-bold text-foreground">{bulkPago.archivo_nombre}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bulkPago.template?.nombre ?? "—"} · {new Date(bulkPago.created_at).toLocaleDateString("es-CO", { dateStyle: "long" })} · {bulkPago.usuario_nombre}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total filas</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{bulkPago.total_filas}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Aplicadas</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-0.5">{aplicadas}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Errores</p>
            <p className={cn("text-xl font-bold mt-0.5", errores > 0 ? "text-destructive" : "text-foreground")}>
              {errores}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total pagado</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-0.5">{COP(bulkPago.total_pagado)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de líneas */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {["Fila", "NIT", "Cliente", "Status", "Distribución aplicada", "Total"].map((h) => (
                <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Sin líneas registradas
                </TableCell>
              </TableRow>
            )}
            {lineas.map((l) => {
              const total = l.aplicaciones?.reduce((s, a) => s + a.valor, 0) ?? 0
              return (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground font-mono">{l.fila}</TableCell>
                  <TableCell className="text-sm text-foreground font-mono">{l.nit ?? "—"}</TableCell>
                  <TableCell className="text-sm text-foreground">{l.cliente_nombre ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-transparent text-xs", STATUS_CLS[l.status] ?? "bg-secondary text-secondary-foreground")}>
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {l.aplicaciones && l.aplicaciones.length > 0 ? (
                      <ul className="space-y-0.5">
                        {l.aplicaciones.map((a, i) => (
                          <li key={i} className="font-mono">
                            <span className="text-primary font-semibold">{a.numero}</span>
                            {" "}cuota{a.cuotas_aplicadas?.length > 1 ? "s" : ""}{" "}
                            {a.cuotas_aplicadas?.map((c) => `#${c}`).join(", ")}
                            {" — "}
                            <span className="text-green-700 dark:text-green-400">{COP(a.valor)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-green-700 dark:text-green-400">
                    {total > 0 ? COP(total) : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
