"use client"

import { useActionState, useEffect } from "react"
import { crearCliente, actualizarCliente, type ClienteFormState } from "@/actions/clientes"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface Entidad { id: string; nombre: string }
interface Cliente {
  id: string; documento: string; nombres: string; apellidos: string
  direccion: string; telefono: string; entidad_id: string
}

const selectCls = "h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"

const initial: ClienteFormState = {}

export function ClienteForm({
  cliente, entidades, onClose,
}: { cliente?: Cliente; entidades: Entidad[]; onClose: () => void }) {
  const isEdit = !!cliente
  const [state, formAction, pending] = useActionState(
    isEdit ? actualizarCliente : crearCliente, initial
  )
  useEffect(() => { if (state.success) onClose() }, [state.success, onClose])

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={cliente.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Documento de identidad <span className="text-destructive">*</span></Label>
          <Input name="documento" defaultValue={cliente?.documento} disabled={isEdit}
            placeholder="Número de cédula" inputMode="numeric" />
          {isEdit && <p className="text-xs text-muted-foreground">El documento no se puede modificar</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Nombres <span className="text-destructive">*</span></Label>
          <Input name="nombres" defaultValue={cliente?.nombres} placeholder="Nombres" autoComplete="given-name" />
        </div>

        <div className="space-y-1.5">
          <Label>Apellidos <span className="text-destructive">*</span></Label>
          <Input name="apellidos" defaultValue={cliente?.apellidos} placeholder="Apellidos" autoComplete="family-name" />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Dirección <span className="text-destructive">*</span></Label>
          <Input name="direccion" defaultValue={cliente?.direccion}
            placeholder="Dirección de residencia" autoComplete="street-address" />
        </div>

        <div className="space-y-1.5">
          <Label>Teléfono <span className="text-destructive">*</span></Label>
          <Input name="telefono" defaultValue={cliente?.telefono} placeholder="300 123 4567" inputMode="tel" />
        </div>

        <div className="space-y-1.5">
          <Label>Entidad donde labora <span className="text-destructive">*</span></Label>
          <select name="entidad_id" defaultValue={cliente?.entidad_id ?? ""} className={selectCls}>
            <option value="">Seleccionar entidad…</option>
            {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : isEdit ? "Actualizar" : "Guardar cliente"}
        </Button>
      </div>
    </form>
  )
}
