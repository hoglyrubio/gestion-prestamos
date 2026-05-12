"use client"

import { useActionState, useEffect, useState, useCallback } from "react"
import { crearPrestamo, actualizarPrestamo, type PrestamoFormState } from "@/actions/prestamos"
import { calcularCuota } from "@/lib/calculos"
import { createClient } from "@/lib/supabase/client"
import { ClienteCombobox } from "@/components/ui/combobox-cliente"

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
}

interface Props {
  prestamo?: Prestamo
  clientes: Cliente[]
  onClose: () => void
}

const initial: PrestamoFormState = {}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

function hoy(): string {
  return new Date().toISOString().split("T")[0]
}

function primerDiaMesSiguiente(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0]
}

export function PrestamoForm({ prestamo, clientes, onClose }: Props) {
  const isEdit = !!prestamo
  const action = isEdit ? actualizarPrestamo : crearPrestamo
  const [state, formAction, pending] = useActionState(action, initial)

  // Campos para preview de cuota — defaults solo para creación
  const [tipo, setTipo] = useState(prestamo?.tipo ?? "LIBRANZA")
  const [capital, setCapital] = useState(prestamo?.capital?.toString() ?? "")
  const [tasa, setTasa] = useState(prestamo?.tasa_interes?.toString() ?? "4")
  const [cuotas, setCuotas] = useState(prestamo?.cuotas?.toString() ?? "")

  // Archivo
  const [uploading, setUploading] = useState(false)
  const [fotoUrl, setFotoUrl] = useState(prestamo?.foto_url ?? "")
  const [fileName, setFileName] = useState<string | null>(
    prestamo?.foto_url ? prestamo.foto_url.split("/").pop() ?? null : null
  )
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => { if (state.success) onClose() }, [state.success, onClose])

  // Calcular cuota preview
  const cuotaPreview = (() => {
    const c = parseFloat(capital)
    const t = parseFloat(tasa)
    const n = parseInt(cuotas, 10)
    if (c > 0 && t > 0 && n > 0) return calcularCuota(c, t, n)
    return null
  })()

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxMB = 10
    if (file.size > maxMB * 1024 * 1024) {
      setUploadError(`El archivo supera los ${maxMB} MB`)
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop()
      const path = `prestamos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from("soportes")
        .upload(path, file, { upsert: false })

      if (error) throw new Error(error.message)

      const { data: { publicUrl } } = supabase.storage
        .from("soportes")
        .getPublicUrl(path)

      setFotoUrl(publicUrl)
      setFileName(file.name)
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }, [])

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={prestamo.id} />}
      <input type="hidden" name="foto_url" value={fotoUrl} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Tipo */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={isEdit}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Seleccionar…</option>
            <option value="LIBRANZA">LIBRANZA</option>
            <option value="PERSONAL">PERSONAL</option>
          </select>
        </div>

        {/* Número */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Número {tipo === "PERSONAL" ? "(generado automáticamente)" : <span className="text-red-500">*</span>}
          </label>
          {tipo === "PERSONAL" ? (
            <input
              value="PP##### (auto)"
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400"
            />
          ) : (
            <input
              name="numero"
              defaultValue={prestamo?.numero}
              disabled={isEdit}
              placeholder="Ej: LIB-2025-001"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
          )}
          {isEdit && <p className="text-xs text-slate-400 mt-1">El número no se puede modificar</p>}
        </div>

        {/* Cliente */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <ClienteCombobox
            clientes={clientes}
            defaultValue={prestamo?.cliente_id}
            disabled={isEdit}
          />
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="fecha"
            defaultValue={prestamo?.fecha ?? hoy()}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Fecha inicio */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Fecha de inicio <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="fecha_inicio"
            defaultValue={prestamo?.fecha_inicio ?? primerDiaMesSiguiente()}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Capital */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Capital <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="capital"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="$ 0"
            min="0"
            step="1000"
            inputMode="numeric"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tasa */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Tasa de interés (% mensual) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="tasa_interes"
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            placeholder="2.5"
            min="0"
            step="0.1"
            inputMode="decimal"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cuotas */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Número de cuotas <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="cuotas"
            value={cuotas}
            onChange={(e) => setCuotas(e.target.value)}
            placeholder="12"
            min="1"
            inputMode="numeric"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Valor cuota (calculado) */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Valor de la cuota
          </label>
          <div className="w-full px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-700 font-medium">
            {cuotaPreview !== null ? COP(cuotaPreview) : "—"}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Capital/n + Capital × tasa
          </p>
        </div>

        {/* Estado (solo en edición) */}
        {isEdit && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Estado
            </label>
            <select
              name="estado"
              defaultValue={prestamo.estado}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ACTIVA">ACTIVA</option>
              <option value="PAGADA">PAGADA</option>
              <option value="ANULADA">ANULADA</option>
            </select>
          </div>
        )}

        {/* Soporte */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Soporte (foto o PDF)
          </label>

          {fileName ? (
            <div className="flex items-center gap-3 px-3 py-2.5 border border-green-200 bg-green-50 rounded-lg">
              <span className="text-green-600 text-lg">📎</span>
              <span className="text-sm text-green-700 flex-1 truncate">{fileName}</span>
              <button
                type="button"
                onClick={() => { setFotoUrl(""); setFileName(null) }}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className={[
              "flex flex-col items-center justify-center gap-1.5 px-4 py-5",
              "border-2 border-dashed border-slate-200 rounded-lg cursor-pointer",
              "hover:border-blue-400 hover:bg-blue-50 transition",
              uploading ? "opacity-60 pointer-events-none" : "",
            ].join(" ")}>
              <span className="text-2xl">{uploading ? "⏳" : "📎"}</span>
              <span className="text-sm text-slate-600">
                {uploading ? "Subiendo…" : "Toca para adjuntar o tomar foto"}
              </span>
              <span className="text-xs text-slate-400">JPG, PNG o PDF — máx. 10 MB</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          )}

          {uploadError && (
            <p className="text-xs text-red-600 mt-1">{uploadError}</p>
          )}
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
          type="submit"
          disabled={pending || uploading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Guardando…" : isEdit ? "Actualizar" : "Guardar préstamo"}
        </button>
      </div>
    </form>
  )
}
