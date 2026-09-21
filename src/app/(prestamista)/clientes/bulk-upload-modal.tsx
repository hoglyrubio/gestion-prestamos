"use client"

import { useRef, useState, useActionState, useEffect } from "react"
import { importarClientes, type BulkImportState } from "@/actions/clientes"
import { Modal } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

interface FilaPreview {
  documento: string; nombres: string; apellidos: string
  direccion: string; telefono: string; entidad_id: string
}

interface ParseResult {
  rows: FilaPreview[]
  clientErrors: string[]
  rawCsv: string
}

function parsearCSVCliente(text: string): ParseResult {
  const clientErrors: string[] = []
  const lineas = text.split(/\r?\n/).filter((l) => l.trim())

  if (lineas.length === 0) return { rows: [], clientErrors: ["El archivo está vacío"], rawCsv: text }
  if (lineas.length < 2)   return { rows: [], clientErrors: ["El archivo sólo tiene encabezado, sin datos"], rawCsv: text }

  const encabezados = lineas[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const esperados = ["documento", "nombres", "apellidos", "direccion", "telefono", "entidad_id"]
  const faltantes = esperados.filter((e) => !encabezados.includes(e))
  if (faltantes.length > 0) {
    clientErrors.push(`Columnas faltantes: ${faltantes.join(", ")}`)
    return { rows: [], clientErrors, rawCsv: text }
  }

  const idx = Object.fromEntries(esperados.map((c) => [c, encabezados.indexOf(c)]))

  const rows: FilaPreview[] = []
  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(",").map((s) => s.trim().replace(/^"|"$/g, ""))
    const get = (c: string) => cols[idx[c]] ?? ""
    rows.push({
      documento:  get("documento"),
      nombres:    get("nombres"),
      apellidos:  get("apellidos"),
      direccion:  get("direccion"),
      telefono:   get("telefono"),
      entidad_id: get("entidad_id"),
    })
  }

  return { rows, clientErrors, rawCsv: text }
}

const PLANTILLA_CSV = "documento,nombres,apellidos,direccion,telefono,entidad_id\n12345678,Juan,Pérez,Cra 1 # 2-3,3001234567,ENTIDAD_ID_AQUI\n"

function descargarPlantilla() {
  const blob = new Blob([PLANTILLA_CSV], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a"); a.href = url; a.download = "plantilla_clientes.csv"
  a.click(); URL.revokeObjectURL(url)
}

export function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [state, formAction, pending]  = useActionState<BulkImportState, FormData>(importarClientes, {})
  const fileRef = useRef<HTMLInputElement>(null)

  const done = state.success || !!state.error

  useEffect(() => {
    if (!state.success) return
    // Refresca la tabla de clientes reiniciando el parse result
    setParseResult(null)
  }, [state.success])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setParseResult(parsearCSVCliente((ev.target?.result as string) ?? ""))
    reader.readAsText(file, "UTF-8")
  }

  const hasFail = (parseResult?.clientErrors.length ?? 0) > 0

  return (
    <Modal title="Carga masiva de clientes" onClose={onClose} wide>
      <div className="space-y-5">

        {/* Instrucciones + plantilla */}
        {!state.success && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-1.5">
            <p className="text-sm font-medium text-foreground">Formato esperado del CSV</p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              documento, nombres, apellidos, direccion, telefono, entidad_id
            </p>
            <p className="text-xs text-muted-foreground">
              El campo <span className="font-mono">entidad_id</span> debe coincidir exactamente con el identificador de la entidad.
              Si hay un documento ya registrado, no se insertará ningún registro.
            </p>
            <button type="button" onClick={descargarPlantilla}
              className="text-xs text-primary underline underline-offset-2 hover:opacity-80">
              Descargar plantilla de ejemplo
            </button>
          </div>
        )}

        {/* Resultado éxito */}
        {state.success && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 px-4 py-4 text-center space-y-2">
            <p className="text-2xl">✅</p>
            <p className="text-base font-semibold text-green-700 dark:text-green-400">
              {state.insertados} registro{state.insertados !== 1 ? "s" : ""} insertado{state.insertados !== 1 ? "s" : ""} correctamente
            </p>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        )}

        {/* Resultado error del servidor */}
        {!state.success && state.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-3">
            <p className="text-sm font-semibold text-destructive">{state.error}</p>
            {state.fallidos && state.fallidos.length > 0 && (
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-1 pr-3 font-medium w-12">Fila</th>
                      <th className="py-1 pr-3 font-medium">Documento</th>
                      <th className="py-1 font-medium">Razón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.fallidos.map((f, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1 pr-3 font-mono text-muted-foreground">{f.fila}</td>
                        <td className="py-1 pr-3 font-mono">{f.documento}</td>
                        <td className="py-1 text-destructive">{f.razon}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              setParseResult(null)
              if (fileRef.current) fileRef.current.value = ""
            }}>
              Intentar de nuevo
            </Button>
          </div>
        )}

        {/* Form: sólo visible si no hay resultado */}
        {!done && (
          <form action={formAction} className="space-y-4">
            {parseResult && !hasFail && (
              <input type="hidden" name="csv_data" value={parseResult.rawCsv} />
            )}

            {/* Selector de archivo */}
            <label className={[
              "flex flex-col items-center justify-center gap-2 px-4 py-6",
              "border-2 border-dashed rounded-lg cursor-pointer transition",
              parseResult && !hasFail
                ? "border-primary/50 bg-primary/5"
                : "border-input hover:border-ring hover:bg-muted/30",
            ].join(" ")}>
              <span className="text-2xl">{parseResult ? "📄" : "📂"}</span>
              <span className="text-sm text-muted-foreground text-center">
                {parseResult
                  ? `${parseResult.rows.length} fila(s) cargadas — haz clic para cambiar el archivo`
                  : "Haz clic para seleccionar el archivo CSV"}
              </span>
              <input type="file" accept=".csv,text/csv" className="hidden"
                ref={fileRef} onChange={handleFileChange} />
            </label>

            {/* Errores de parseo en el cliente */}
            {hasFail && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1">
                {parseResult!.clientErrors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">{e}</p>
                ))}
              </div>
            )}

            {/* Vista previa */}
            {parseResult && !hasFail && parseResult.rows.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Vista previa — primeras {Math.min(parseResult.rows.length, 5)} de {parseResult.rows.length} fila(s)
                </p>
                <div className="overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50 text-left text-muted-foreground">
                        {["Documento", "Nombres", "Apellidos", "Dirección", "Teléfono", "Entidad ID"].map((h) => (
                          <th key={h} className="px-2 py-1.5 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-2 py-1 font-mono">{r.documento}</td>
                          <td className="px-2 py-1">{r.nombres}</td>
                          <td className="px-2 py-1">{r.apellidos}</td>
                          <td className="px-2 py-1 max-w-32 truncate">{r.direccion}</td>
                          <td className="px-2 py-1 font-mono">{r.telefono}</td>
                          <td className="px-2 py-1 font-mono text-muted-foreground">{r.entidad_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit"
                disabled={!parseResult || hasFail || parseResult.rows.length === 0 || pending}>
                {pending
                  ? "Procesando…"
                  : parseResult && !hasFail
                    ? `Importar ${parseResult.rows.length} registro${parseResult.rows.length !== 1 ? "s" : ""}`
                    : "Importar"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
