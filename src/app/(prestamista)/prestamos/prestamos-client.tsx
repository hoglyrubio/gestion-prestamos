"use client"

import { useState } from "react"
import { PrestamoForm } from "./prestamo-form"

interface Cliente { id: string; nombres: string; apellidos: string; documento: string }

interface Prestamo {
  id: string
  tipo: string
  numero: string
  cliente_id: string
  fecha: string
  fecha_inicio: string
  capital: number
  tasa_interes: number
  cuotas: number
  valor_cuota: number
  estado: string
  foto_url: string | null
  cliente: { nombres: string; apellidos: string } | null
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const ESTADO_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVA:   { label: "ACTIVA",   cls: "bg-green-100 text-green-700" },
  PAGADA:   { label: "PAGADA",   cls: "bg-slate-100 text-slate-600" },
  ANULADA:  { label: "ANULADA",  cls: "bg-red-100 text-red-600" },
}

const TIPO_MAP: Record<string, string> = {
  LIBRANZA: "bg-blue-100 text-blue-700",
  PERSONAL: "bg-purple-100 text-purple-700",
}

const FILTROS = ["Todos", "ACTIVA", "PAGADA", "ANULADA"] as const

export function PrestamosClient({
  prestamos,
  clientes,
}: {
  prestamos: Prestamo[]
  clientes: Cliente[]
}) {
  const [modal, setModal] = useState<{ open: boolean; prestamo?: Prestamo }>({ open: false })
  const [filtro, setFiltro] = useState<string>("Todos")
  const [search, setSearch] = useState("")

  const filtered = prestamos.filter((p) => {
    const matchFiltro = filtro === "Todos" || p.estado === filtro
    const q = search.toLowerCase()
    const matchSearch =
      p.numero.toLowerCase().includes(q) ||
      (p.cliente?.nombres + " " + p.cliente?.apellidos).toLowerCase().includes(q)
    return matchFiltro && matchSearch
  })

  // Stats
  const activos = prestamos.filter((p) => p.estado === "ACTIVA")
  const capitalColocado = activos.reduce((s, p) => s + p.capital, 0)
  const porCobrar = activos.reduce((s, p) => s + p.valor_cuota, 0)

  return (
    <>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Préstamos</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de préstamos activos e historial</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex-shrink-0 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition cursor-pointer"
        >
          + Nuevo préstamo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Capital colocado" value={COP(capitalColocado)} sub="Préstamos activos" color="blue" />
        <StatCard label="Activos" value={String(activos.length)} sub="En curso" color="green" />
        <StatCard label="Por cobrar / mes" value={COP(porCobrar)} sub="Suma cuotas activas" color="amber" />
        <StatCard label="Total" value={String(prestamos.length)} sub="Todos los estados" />
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer",
                filtro === f
                  ? "bg-blue-700 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Número o cliente…"
            className="w-full sm:w-60 pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["Número", "Cliente", "Tipo", "Capital", "Cuotas", "Vlr. cuota", "Tasa", "Estado", "Soporte", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => {
                const estado = ESTADO_MAP[p.estado] ?? { label: p.estado, cls: "bg-slate-100 text-slate-600" }
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-700 whitespace-nowrap">
                      {p.numero}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                      {p.cliente ? `${p.cliente.nombres} ${p.cliente.apellidos}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_MAP[p.tipo] ?? ""}`}>
                        {p.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                      {COP(p.capital)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center">
                      {p.cuotas}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                      {COP(p.valor_cuota)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {p.tasa_interes}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.cls}`}>
                        {estado.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.foto_url ? (
                        <a
                          href={p.foto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          📎 Ver
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModal({ open: true, prestamo: p })}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                    {search || filtro !== "Todos"
                      ? "No hay préstamos con ese criterio"
                      : <>No hay préstamos registrados.{" "}
                          <button onClick={() => setModal({ open: true })} className="text-blue-600 underline">
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
          onClick={(e) => e.target === e.currentTarget && setModal({ open: false })}
        >
          <div className="bg-white w-full sm:max-w-2xl rounded-2xl sm:rounded-xl p-6 shadow-xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">
                {modal.prestamo ? `Editar préstamo ${modal.prestamo.numero}` : "Nuevo préstamo"}
              </h3>
              <button
                onClick={() => setModal({ open: false })}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <PrestamoForm
              prestamo={modal.prestamo}
              clientes={clientes}
              onClose={() => setModal({ open: false })}
            />
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  const cls = color === "blue" ? "text-blue-700"
    : color === "green" ? "text-green-600"
    : color === "amber" ? "text-amber-600"
    : "text-slate-900"
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${cls} leading-tight`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}
