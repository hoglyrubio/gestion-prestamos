"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

async function getAuthorizedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  const allowed = profile?.status === "ACTIVE" &&
    (profile?.role === "PRESTAMISTA" || profile?.role === "ADMIN")

  if (!allowed) throw new Error("Sin permisos")

  return { supabase, userId: user.id }
}

export type ClienteFormState = {
  error?: string
  success?: boolean
}

export type BulkImportState = {
  error?: string
  success?: boolean
  insertados?: number
  fallidos?: { fila: number; documento: string; razon: string }[]
}

const COLUMNAS = ["documento", "nombres", "apellidos", "direccion", "telefono", "entidad_id"] as const

export async function importarClientes(
  _prev: BulkImportState,
  formData: FormData
): Promise<BulkImportState> {
  try {
    const { supabase, userId } = await getAuthorizedClient()

    const csvData = ((formData.get("csv_data") as string) ?? "").trim()
    if (!csvData) return { error: "No se recibió contenido del archivo" }

    const lineas = csvData.split(/\r?\n/).filter((l) => l.trim())
    if (lineas.length < 2)
      return { error: "El archivo debe tener encabezado y al menos una fila de datos" }

    const encabezados = parseCSVLine(lineas[0]).map((h) => h.trim().toLowerCase())
    const faltantes = COLUMNAS.filter((c) => !encabezados.includes(c))
    if (faltantes.length > 0)
      return { error: `Columnas faltantes o incorrectas: ${faltantes.join(", ")}. Se esperan: ${COLUMNAS.join(", ")}` }

    const idx = Object.fromEntries(COLUMNAS.map((c) => [c, encabezados.indexOf(c)])) as Record<string, number>

    const fallidos: { fila: number; documento: string; razon: string }[] = []
    const filas: { documento: string; nombres: string; apellidos: string; direccion: string; telefono: string; entidad_id: string }[] = []

    for (let i = 1; i < lineas.length; i++) {
      const numFila = i + 1
      const cols = parseCSVLine(lineas[i]).map((s) => s.trim())
      const get = (c: string) => cols[idx[c]] ?? ""

      const documento  = get("documento")
      const nombres    = get("nombres")
      const apellidos  = get("apellidos")
      const direccion  = get("direccion")
      const telefono   = get("telefono")
      const entidad_id = get("entidad_id")

      if (!documento)  { fallidos.push({ fila: numFila, documento: "(vacío)", razon: "El documento es obligatorio" }); continue }
      if (!nombres)    { fallidos.push({ fila: numFila, documento, razon: "Los nombres son obligatorios" }); continue }
      if (!apellidos)  { fallidos.push({ fila: numFila, documento, razon: "Los apellidos son obligatorios" }); continue }
      if (!direccion)  { fallidos.push({ fila: numFila, documento, razon: "La dirección es obligatoria" }); continue }
      if (!telefono)   { fallidos.push({ fila: numFila, documento, razon: "El teléfono es obligatorio" }); continue }
      if (!entidad_id) { fallidos.push({ fila: numFila, documento, razon: "El entidad_id es obligatorio" }); continue }

      filas.push({ documento, nombres, apellidos, direccion, telefono, entidad_id })
    }

    if (fallidos.length > 0)
      return { error: `${fallidos.length} fila(s) con errores de validación. No se insertó ningún registro.`, fallidos }
    if (filas.length === 0)
      return { error: "No se encontraron filas de datos en el archivo" }

    // Documentos duplicados dentro del mismo archivo
    const docs = filas.map((r) => r.documento)
    const dupsDentro = docs.filter((d, i) => docs.indexOf(d) !== i)
    if (dupsDentro.length > 0) {
      const unicos = [...new Set(dupsDentro)]
      return {
        error: `El archivo tiene ${unicos.length} documento(s) repetido(s). No se insertó ningún registro.`,
        fallidos: unicos.map((doc) => ({
          fila: filas.findIndex((r) => r.documento === doc) + 2,
          documento: doc,
          razon: "Documento repetido dentro del mismo archivo",
        })),
      }
    }

    // Documentos que ya existen en la base de datos
    const { data: existentes } = await supabase
      .from("clientes")
      .select("documento")
      .in("documento", docs)

    if (existentes && existentes.length > 0) {
      const existentesSet = new Set(existentes.map((e: { documento: string }) => e.documento))
      return {
        error: `${existentes.length} documento(s) ya existen en la base de datos. No se insertó ningún registro.`,
        fallidos: filas
          .filter((r) => existentesSet.has(r.documento))
          .map((r) => ({ fila: filas.indexOf(r) + 2, documento: r.documento, razon: "Ya existe un cliente con este documento" })),
      }
    }

    // Inserción atómica — un único INSERT en Postgres
    const { error: insertError } = await supabase
      .from("clientes")
      .insert(filas.map((r) => ({ ...r, prestamista_id: userId })))

    if (insertError) {
      if (insertError.code === "23505")
        return { error: "Uno o más documentos ya existen en la base de datos. No se insertó ningún registro." }
      if (insertError.code === "23503")
        return { error: `Una o más entidades no existen (entidad_id inválido). No se insertó ningún registro. Detalle: ${insertError.message}` }
      return { error: insertError.message }
    }

    revalidatePath("/clientes")
    return { success: true, insertados: filas.length }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function crearCliente(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  try {
    const { supabase, userId } = await getAuthorizedClient()

    const documento = (formData.get("documento") as string).trim()
    const nombres = (formData.get("nombres") as string).trim()
    const apellidos = (formData.get("apellidos") as string).trim()
    const direccion = (formData.get("direccion") as string).trim()
    const telefono = (formData.get("telefono") as string).trim()
    const entidad_id = (formData.get("entidad_id") as string).trim()

    if (!documento || !nombres || !apellidos || !direccion || !telefono || !entidad_id) {
      return { error: "Todos los campos son obligatorios" }
    }

    const { error } = await supabase.from("clientes").insert({
      prestamista_id: userId,  // ← asignado automáticamente
      documento,
      nombres,
      apellidos,
      direccion,
      telefono,
      entidad_id,
    })

    if (error) {
      if (error.code === "23505") return { error: "Ya existe un cliente registrado con ese documento" }
      return { error: error.message }
    }

    revalidatePath("/clientes")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function actualizarCliente(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  try {
    const { supabase } = await getAuthorizedClient()

    const id = formData.get("id") as string
    const nombres = (formData.get("nombres") as string).trim()
    const apellidos = (formData.get("apellidos") as string).trim()
    const direccion = (formData.get("direccion") as string).trim()
    const telefono = (formData.get("telefono") as string).trim()
    const entidad_id = (formData.get("entidad_id") as string).trim()

    if (!nombres || !apellidos || !direccion || !telefono || !entidad_id) {
      return { error: "Todos los campos son obligatorios" }
    }

    // RLS garantiza que solo prestamistas activos pueden actualizar
    const { error } = await supabase
      .from("clientes")
      .update({ nombres, apellidos, direccion, telefono, entidad_id })
      .eq("id", id)

    if (error) return { error: error.message }

    revalidatePath("/clientes")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
