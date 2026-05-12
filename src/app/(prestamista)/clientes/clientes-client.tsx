"use client"

import { useState } from "react"
import { ClienteForm } from "./cliente-form"

interface Entidad { id: string; nombre: string }

interface Cliente {
  id: string
  documento: string
  nombres: string
  apellidos: string
  direccion: string
  telefono: string
  entidad_id: string
  entidad: { nombre: string } | null
}

interface Modal { open: boolean; cliente?: Cliente }

export function ClientesClient({
  clientes,
  entidades,
}: {
  clientes: Cliente[]
  entidades: Entidad[]
}) {
  const [modal, setModal] = useState<Modal>({ open: false })
  const [search, setSearch] = useState("")

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.nombres.toLowerCase().includes(q) ||
      c.apellidos.toLowerCase().includes(q) ||
      c.documento.includes(q)
    )
  })

  const openCreate = () => setModal({ open: true })
  const openEdit = (c: Cliente) => setModal({ open: true, cliente: c })
  const closeModal = () => setModal({ open: false })

  return (
    <>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clientes</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Personas con préstamos activos o historial
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex-shrink-0 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition cursor-pointer"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o documento…"
          className="w-full sm:w-72 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["Documento", "Nombre", "Teléfono", "Entidad", "Dirección", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm text-blue-700 font-medium whitespace-nowrap">
                    {c.documento}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                    {c.nombres} {c.apellidos}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                    {c.telefono}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                      {c.entidad?.nombre ?? c.entidad_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {c.direccion}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    {search
                      ? "No se encontraron clientes con ese criterio"
                      : <>No hay clientes registrados.{" "}
                          <button onClick={openCreate} className="text-blue-600 underline">
                            Crear el primero
                          </button>
                        </>
                    }
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
          <div className="bg-white w-full sm:max-w-lg rounded-2xl sm:rounded-xl p-6 shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">
                {modal.cliente ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer">
                ✕
              </button>
            </div>
            <ClienteForm
              cliente={modal.cliente}
              entidades={entidades}
              onClose={closeModal}
            />
          </div>
        </div>
      )}
    </>
  )
}
