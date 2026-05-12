"use client"

import { useActionState, useEffect } from "react"
import { crearEntidad, actualizarEntidad, type EntidadFormState } from "@/actions/entidades"

interface Entidad {
  id: string
  nombre: string
  direccion: string | null
  contacto: string | null
  numero_contacto: string | null
}

interface EntidadFormProps {
  entidad?: Entidad
  onClose: () => void
}

const initialState: EntidadFormState = {}

export function EntidadForm({ entidad, onClose }: EntidadFormProps) {
  const isEdit = !!entidad
  const action = isEdit ? actualizarEntidad : crearEntidad

  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  return (
    <form action={formAction} className="space-y-4">
      {/* ID oculto en edición */}
      {isEdit && <input type="hidden" name="id" value={entidad.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={isEdit ? "sm:col-span-2" : ""}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            ID / NIT <span className="text-red-500">*</span>
          </label>
          <input
            name="id"
            defaultValue={entidad?.id}
            disabled={isEdit}
            maxLength={20}
            placeholder="800123456 o COOP-001"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          />
          {isEdit && (
            <p className="text-xs text-slate-400 mt-1">El ID no se puede modificar</p>
          )}
        </div>

        <div className={isEdit ? "" : "sm:col-span-1"}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            name="nombre"
            defaultValue={entidad?.nombre}
            placeholder="Nombre de la entidad"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Dirección
          </label>
          <input
            name="direccion"
            defaultValue={entidad?.direccion ?? ""}
            placeholder="Opcional"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Contacto
          </label>
          <input
            name="contacto"
            defaultValue={entidad?.contacto ?? ""}
            placeholder="Nombre del contacto"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Número de contacto
          </label>
          <input
            name="numero_contacto"
            defaultValue={entidad?.numero_contacto ?? ""}
            placeholder="300 123 4567"
            inputMode="tel"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Guardando…" : isEdit ? "Actualizar" : "Guardar entidad"}
        </button>
      </div>
    </form>
  )
}
