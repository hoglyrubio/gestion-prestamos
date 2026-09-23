"use client"

import { useState } from "react"
import Link from "next/link"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { NuevoBulkModal } from "./nuevo-bulk-modal"

interface Template { id: string; nombre: string; template: string }
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

export function BulkClient({
  bulkPagos, templates, page, totalPages,
}: {
  bulkPagos: BulkPago[]
  templates: Template[]
  page: number
  totalPages: number
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pagos en lote</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Carga masiva de pagos desde archivos CSV</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Nuevo pago en lote</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Ejecuciones</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{bulkPagos.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total pagado</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-0.5">
              {COP(bulkPagos.reduce((s, b) => s + (b.total_pagado ?? 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total filas procesadas</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              {bulkPagos.reduce((s, b) => s + b.total_filas, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {["Fecha", "Template", "Archivo", "Usuario", "Filas", "Total pagado", ""].map((h) => (
                <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulkPagos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Aún no hay pagos en lote registrados
                </TableCell>
              </TableRow>
            )}
            {bulkPagos.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-sm text-foreground whitespace-nowrap">
                  {new Date(b.created_at).toLocaleDateString("es-CO")}
                </TableCell>
                <TableCell className="text-sm text-foreground">{b.template?.nombre ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{b.archivo_nombre}</TableCell>
                <TableCell className="text-sm text-foreground">{b.usuario_nombre}</TableCell>
                <TableCell className="text-sm text-foreground text-center">{b.total_filas}</TableCell>
                <TableCell className="text-sm font-medium text-green-700 dark:text-green-400">
                  {COP(b.total_pagado)}
                </TableCell>
                <TableCell>
                  <Link href={`/pagos/bulk/${b.id}`}
                    className="text-xs text-primary hover:underline whitespace-nowrap">
                    Ver detalles →
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 pb-3">
          <Pagination page={page} totalPages={totalPages} />
        </div>
      </div>

      {showModal && (
        <NuevoBulkModal
          templates={templates}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); window.location.reload() }}
        />
      )}
    </>
  )
}
