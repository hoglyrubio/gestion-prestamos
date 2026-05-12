"use client"

import { useActionState, useEffect } from "react"
import { crearCliente, actualizarCliente, type ClienteFormState } from "@/actions/clientes"

interface Entidad { id: string; nombre: string }

interface Cliente {
  id: string
  documento: string
  nombres: string
  apellidos: string
  direccion: string
  telefono: string
  entidad_id: string
}

interface ClienteFormProps {
  cliente?: Cliente
  entidades: Entidad[]
  onClose: () => void
}

const initial: ClienteFormState = {}

export function ClienteForm({ cliente, entidades, onClose }: ClienteFormProps) {
  const isEdit = !!cliente
  const action = isEdit ? actualizarCliente : crearCliente
  const [state, formAction, pending] = useActionState(action, initial)

  useEffect(() => { if (state.success) onClose() }, [state.success, onClose])

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={cliente.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Documento de identidad <span className="text-red-500">*</span>
          </label>
          <input
            name="documento"
            defaultValue={cliente?.documento}
            disabled={isEdit}
            placeholder="Número de cédula"
            inputMode="numeric"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          />
          {isEdit && (
            <p className="text-xs text-slate-400 mt-1">El documento no se puede modificar</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nombres <span className="text-red-500">*</span>
          </label>
          <input
            name="nombres"
            defaultValue={cliente?.nombres}
            placeholder="Nombres"
            autoComplete="given-name"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Apellidos <span className="text-red-500">*</span>
          </label>
          <input
            name="apellidos"
            defaultValue={cliente?.apellidos}
            placeholder="Apellidos"
            autoComplete="family-name"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Dirección <span className="text-red-500">*</span>
          </label>
          <input
            name="direccion"
            defaultValue={cliente?.direccion}
            placeholder="Dirección de residencia"
            autoComplete="street-address"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Teléfono <span className="text-red-500">*</span>
          </label>
          <input
            name="telefono"
            defaultValue={cliente?.telefono}
            placeholder="300 123 4567"
            inputMode="tel"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Entidad donde labora <span className="text-red-500">*</span>
          </label>
          <select
            name="entidad_id"
            defaultValue={cliente?.entidad_id ?? ""}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Seleccionar entidad…</option>
            {entidades.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button" onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit" disabled={pending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Guardando…" : isEdit ? "Actualizar" : "Guardar cliente"}
        </button>
      </div>
    </form>
  )
}
