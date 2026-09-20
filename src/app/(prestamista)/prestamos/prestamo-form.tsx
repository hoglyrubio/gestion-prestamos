"use client"

import { useActionState, useEffect, useState, useCallback } from "react"
import { crearPrestamo, actualizarPrestamo, type PrestamoFormState } from "@/actions/prestamos"
import { calcularCuota } from "@/lib/calculos"
import { createClient } from "@/lib/supabase/client"
import { ClienteCombobox } from "@/components/ui/combobox-cliente"
import { EntidadCombobox } from "@/components/ui/combobox-entidad"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface Cliente { id: string; nombres: string; apellidos: string; documento: string }
interface Entidad { id: string; nombre: string }
interface Prestamo {
  id: string; tipo: string; numero: string; cliente_id: string; entidad_id: string | null
  fecha: string; fecha_inicio: string; capital: number; tasa_interes: number
  cuotas: number; valor_cuota: number; estado: string; foto_url: string | null
}

const selectCls = "h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const initial: PrestamoFormState = {}

export function PrestamoForm({ prestamo, clientes, entidades, onClose }: {
  prestamo?: Prestamo; clientes: Cliente[]; entidades: Entidad[]; onClose: () => void
}) {
  const isEdit = !!prestamo
  const [state, formAction, pending] = useActionState(
    isEdit ? actualizarPrestamo : crearPrestamo, initial
  )

  const [tipo, setTipo]     = useState(prestamo?.tipo ?? "LIBRANZA")
  const [capital, setCapital] = useState(prestamo?.capital?.toString() ?? "")
  const [tasa, setTasa]     = useState(prestamo?.tasa_interes?.toString() ?? "4")
  const [cuotas, setCuotas] = useState(prestamo?.cuotas?.toString() ?? "")
  const [uploading, setUploading] = useState(false)
  const [fotoUrl, setFotoUrl]     = useState(prestamo?.foto_url ?? "")
  const [fileName, setFileName]   = useState<string | null>(
    prestamo?.foto_url ? prestamo.foto_url.split("/").pop() ?? null : null
  )
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => { if (state.success) onClose() }, [state.success, onClose])

  const cuotaPreview = (() => {
    const c = parseFloat(capital), t = parseFloat(tasa), n = parseInt(cuotas, 10)
    return c > 0 && t > 0 && n > 0 ? calcularCuota(c, t, n) : null
  })()

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { setUploadError("El archivo supera los 10 MB"); return }
    setUploadError(null); setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop()
      const path = `prestamos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("soportes").upload(path, file, { upsert: false })
      if (error) throw new Error(error.message)
      const { data: { publicUrl } } = supabase.storage.from("soportes").getPublicUrl(path)
      setFotoUrl(publicUrl); setFileName(file.name)
    } catch (err) { setUploadError((err as Error).message) }
    finally { setUploading(false) }
  }, [])

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={prestamo.id} />}
      <input type="hidden" name="foto_url" value={fotoUrl} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo <span className="text-destructive">*</span></Label>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}
            disabled={isEdit} className={selectCls}>
            <option value="">Seleccionar…</option>
            <option value="LIBRANZA">LIBRANZA</option>
            <option value="PERSONAL">PERSONAL</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>
            Número {tipo === "PERSONAL"
              ? <span className="text-muted-foreground font-normal">(auto)</span>
              : <span className="text-destructive">*</span>}
          </Label>
          {tipo === "PERSONAL" ? (
            <Input value="PP##### (auto)" disabled />
          ) : (
            <Input name="numero" defaultValue={prestamo?.numero} disabled={isEdit}
              placeholder="Ej: LIB-2025-001" />
          )}
          {isEdit && <p className="text-xs text-muted-foreground">El número no se puede modificar</p>}
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Cliente <span className="text-destructive">*</span></Label>
          <ClienteCombobox clientes={clientes} defaultValue={prestamo?.cliente_id} disabled={isEdit} />
        </div>

        {tipo === "LIBRANZA" && (
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Entidad <span className="text-destructive">*</span></Label>
            <EntidadCombobox entidades={entidades} defaultValue={prestamo?.entidad_id ?? undefined} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Fecha <span className="text-destructive">*</span></Label>
          <Input type="date" name="fecha"
            defaultValue={prestamo?.fecha ?? new Date().toISOString().split("T")[0]} />
        </div>

        <div className="space-y-1.5">
          <Label>Fecha de inicio <span className="text-destructive">*</span></Label>
          <Input type="date" name="fecha_inicio" defaultValue={prestamo?.fecha_inicio ?? (() => {
            const d = new Date()
            return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0]
          })()} />
        </div>

        <div className="space-y-1.5">
          <Label>Capital <span className="text-destructive">*</span></Label>
          <Input type="number" name="capital" value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="$ 0" min="0" step="1000" inputMode="numeric" />
        </div>

        <div className="space-y-1.5">
          <Label>Tasa de interés (% mensual) <span className="text-destructive">*</span></Label>
          <Input type="number" name="tasa_interes" value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            placeholder="2.5" min="0" step="0.1" inputMode="decimal" />
        </div>

        <div className="space-y-1.5">
          <Label>Número de cuotas <span className="text-destructive">*</span></Label>
          <Input type="number" name="cuotas" value={cuotas}
            onChange={(e) => setCuotas(e.target.value)}
            placeholder="12" min="1" inputMode="numeric" />
        </div>

        <div className="space-y-1.5">
          <Label>Valor de la cuota</Label>
          <div className="h-8 flex items-center px-2.5 rounded-lg border border-input bg-muted/50 text-sm font-medium text-foreground">
            {cuotaPreview !== null ? COP(cuotaPreview) : "—"}
          </div>
          <p className="text-[10px] text-muted-foreground">Capital/n + Capital × tasa</p>
        </div>

        {isEdit && (
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <select name="estado" defaultValue={prestamo.estado} className={selectCls}>
              <option value="ACTIVA">ACTIVA</option>
              <option value="PAGADA">PAGADA</option>
              <option value="ANULADA">ANULADA</option>
            </select>
          </div>
        )}

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Soporte <span className="text-muted-foreground font-normal">(foto o PDF)</span></Label>
          {fileName ? (
            <div className="flex items-center gap-3 px-3 py-2.5 border border-border bg-muted/50 rounded-lg">
              <span className="text-base">📎</span>
              <span className="text-sm text-foreground flex-1 truncate">{fileName}</span>
              <button type="button" onClick={() => { setFotoUrl(""); setFileName(null) }}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>
          ) : (
            <label className={[
              "flex flex-col items-center justify-center gap-1.5 px-4 py-5",
              "border-2 border-dashed border-input rounded-lg cursor-pointer",
              "hover:border-ring hover:bg-muted/30 transition",
              uploading ? "opacity-60 pointer-events-none" : "",
            ].join(" ")}>
              <span className="text-2xl">{uploading ? "⏳" : "📎"}</span>
              <span className="text-sm text-muted-foreground">
                {uploading ? "Subiendo…" : "Toca para adjuntar o tomar foto"}
              </span>
              <span className="text-xs text-muted-foreground">JPG, PNG o PDF — máx. 10 MB</span>
              <input type="file" accept="image/*,application/pdf" capture="environment"
                className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>
          )}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Guardando…" : isEdit ? "Actualizar" : "Guardar préstamo"}
        </Button>
      </div>
    </form>
  )
}
