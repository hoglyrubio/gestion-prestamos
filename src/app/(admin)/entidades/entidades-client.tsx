"use client"

import { useState } from "react"
import { EntidadForm } from "./entidad-form"
import { Pagination } from "@/components/ui/pagination"
import { Sheet, Modal, Field } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

interface Entidad {
  id: string; nombre: string; direccion: string | null
  contacto: string | null; numero_contacto: string | null
}

export function EntidadesClient({
  entidades, page, totalPages,
}: { entidades: Entidad[]; page: number; totalPages: number }) {
  const [detail, setDetail]   = useState<Entidad | null>(null)
  const [formEntidad, setForm] = useState<Entidad | null | "new">(null)

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Entidades</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Empresas empleadoras con descuento por nómina</p>
        </div>
        <Button onClick={() => setForm("new")}>+ Nueva entidad</Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {["ID / NIT", "Nombre", "Contacto"].map((h) => (
                <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entidades.map((e) => (
              <TableRow key={e.id} onClick={() => setDetail(e)} className="cursor-pointer">
                <TableCell className="font-mono text-primary font-medium">{e.id}</TableCell>
                <TableCell className="font-medium text-foreground">{e.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{e.contacto ?? "—"}</TableCell>
              </TableRow>
            ))}
            {entidades.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                  No hay entidades.{" "}
                  <button onClick={() => setForm("new")} className="text-primary underline">Crear la primera</button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-3"><Pagination page={page} totalPages={totalPages} /></div>
      </div>

      {detail && (
        <Sheet title={detail.nombre} onClose={() => setDetail(null)}>
          <Field label="ID / NIT"  value={detail.id} mono />
          <Field label="Dirección" value={detail.direccion} />
          <Field label="Contacto"  value={detail.contacto} />
          <Field label="Teléfono"  value={detail.numero_contacto} />
          <Button className="w-full" onClick={() => { setDetail(null); setForm(detail) }}>
            Editar entidad
          </Button>
        </Sheet>
      )}

      {formEntidad !== null && (
        <Modal title={formEntidad === "new" ? "Nueva entidad" : "Editar entidad"} onClose={() => setForm(null)}>
          <EntidadForm
            entidad={formEntidad === "new" ? undefined : formEntidad}
            onClose={() => setForm(null)}
          />
        </Modal>
      )}
    </>
  )
}
