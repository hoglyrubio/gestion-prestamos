"use client"

import { useActionState, useEffect } from "react"
import { crearEntidad, actualizarEntidad, type EntidadFormState } from "@/actions/entidades"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface Entidad {
  id: string; nombre: string; direccion: string | null
  contacto: string | null; numero_contacto: string | null
}

const initial: EntidadFormState = {}

export function EntidadForm({
  entidad, onClose,
}: { entidad?: Entidad; onClose: () => void }) {
  const isEdit = !!entidad
  const [state, formAction, pending] = useActionState(
    isEdit ? actualizarEntidad : crearEntidad, initial
  )
  useEffect(() => { if (state.success) onClose() }, [state.success, onClose])

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={entidad.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={isEdit ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
          <Label>ID / NIT <span className="text-destructive">*</span></Label>
          <Input name="id" defaultValue={entidad?.id} disabled={isEdit}
            maxLength={20} placeholder="800123456 o COOP-001" />
          {isEdit && <p className="text-xs text-muted-foreground">El ID no se puede modificar</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Nombre <span className="text-destructive">*</span></Label>
          <Input name="nombre" defaultValue={entidad?.nombre} placeholder="Nombre de la entidad" />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Dirección</Label>
          <Input name="direccion" defaultValue={entidad?.direccion ?? ""} placeholder="Opcional" />
        </div>

        <div className="space-y-1.5">
          <Label>Contacto</Label>
          <Input name="contacto" defaultValue={entidad?.contacto ?? ""} placeholder="Nombre del contacto" />
        </div>

        <div className="space-y-1.5">
          <Label>Número de contacto</Label>
          <Input name="numero_contacto" defaultValue={entidad?.numero_contacto ?? ""}
            placeholder="300 123 4567" inputMode="tel" />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : isEdit ? "Actualizar" : "Guardar entidad"}
        </Button>
      </div>
    </form>
  )
}
