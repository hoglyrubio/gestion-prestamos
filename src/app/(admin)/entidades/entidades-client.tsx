"use client"

import { useState } from "react"
import { EntidadForm } from "./entidad-form"

interface Entidad {
  id: string
  nombre: string
  direccion: string | null
  contacto: string | null
  numero_contacto: string | null
}

interface Modal {
  open: boolean
  entidad?: Entidad
}

export function EntidadesClient({ entidades }: { entidades: Entidad[] }) {
  const [modal, setModal] = useState<Modal>({ open: false })

  const openCreate = () => setModal({ open: true })
  const openEdit = (e: Entidad) => setModal({ open: true, entidad: e })
  const closeModal = () => setModal({ open: false })

  return (
    <>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Entidades</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Empresas empleadoras con descuento por nómina
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex-shrink-0 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition cursor-pointer"
        >
          + Nueva entidad
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["ID / NIT", "Nombre", "Dirección", "Contacto", "Teléfono", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entidades.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm text-blue-700 font-medium whitespace-nowrap">
                    {e.id}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {e.nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {e.direccion ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {e.contacto ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                    {e.numero_contacto ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(e)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {entidades.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    No hay entidades registradas.{" "}
                    <button onClick={openCreate} className="text-blue-600 underline">
                      Crear la primera
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white w-full sm:max-w-lg rounded-2xl sm:rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">
                {modal.entidad ? "Editar entidad" : "Nueva entidad"}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <EntidadForm entidad={modal.entidad} onClose={closeModal} />
          </div>
        </div>
      )}
    </>
  )
}
