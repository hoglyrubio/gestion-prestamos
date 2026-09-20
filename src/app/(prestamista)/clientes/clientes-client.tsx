"use client"

import { useState } from "react"
import { ClienteForm } from "./cliente-form"
import { Pagination } from "@/components/ui/pagination"
import { Sheet, Modal, Field } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

interface Entidad { id: string; nombre: string }
interface Cliente {
  id: string; documento: string; nombres: string; apellidos: string
  direccion: string; telefono: string; entidad_id: string
  entidad: { nombre: string } | null
}

export function ClientesClient({
  clientes, entidades, page, totalPages,
}: { clientes: Cliente[]; entidades: Entidad[]; page: number; totalPages: number }) {
  const [detail, setDetail]    = useState<Cliente | null>(null)
  const [formCliente, setForm] = useState<Cliente | null | "new">(null)
  const [search, setSearch]    = useState("")

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase()
    return c.nombres.toLowerCase().includes(q)
      || c.apellidos.toLowerCase().includes(q)
      || c.documento.includes(q)
  })

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Personas con préstamos activos o historial</p>
        </div>
        <Button onClick={() => setForm("new")}>+ Nuevo cliente</Button>
      </div>

      <div className="mb-4 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">🔍</span>
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o documento…" className="pl-9 sm:w-72" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {["Nombre", "Documento", "Entidad"].map((h) => (
                <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} onClick={() => setDetail(c)} className="cursor-pointer">
                <TableCell className="font-medium text-foreground">{c.nombres} {c.apellidos}</TableCell>
                <TableCell className="font-mono text-primary">{c.documento}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{c.entidad?.nombre ?? c.entidad_id ?? "—"}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                  {search ? "Sin resultados" : (
                    <><button onClick={() => setForm("new")} className="text-primary underline">Crear el primer cliente</button></>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-3"><Pagination page={page} totalPages={totalPages} /></div>
      </div>

      {detail && (
        <Sheet title={`${detail.nombres} ${detail.apellidos}`} onClose={() => setDetail(null)}>
          <Field label="Documento" value={detail.documento} mono />
          <Field label="Teléfono"  value={detail.telefono} />
          <Field label="Dirección" value={detail.direccion} />
          <Field label="Entidad"   value={detail.entidad?.nombre ?? detail.entidad_id} />
          <Button className="w-full" onClick={() => { setDetail(null); setForm(detail) }}>
            Editar cliente
          </Button>
        </Sheet>
      )}

      {formCliente !== null && (
        <Modal title={formCliente === "new" ? "Nuevo cliente" : "Editar cliente"} onClose={() => setForm(null)}>
          <ClienteForm
            cliente={formCliente === "new" ? undefined : formCliente}
            entidades={entidades}
            onClose={() => setForm(null)}
          />
        </Modal>
      )}
    </>
  )
}
