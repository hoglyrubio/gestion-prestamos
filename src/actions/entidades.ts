"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "ADMIN" || profile?.status !== "ACTIVE") {
    throw new Error("Sin permisos")
  }

  return supabase
}

export type EntidadFormState = {
  error?: string
  success?: boolean
}

export async function crearEntidad(
  _prev: EntidadFormState,
  formData: FormData
): Promise<EntidadFormState> {
  try {
    const supabase = await getAdminClient()

    const id = (formData.get("id") as string).trim()
    const nombre = (formData.get("nombre") as string).trim()
    const direccion = (formData.get("direccion") as string).trim() || null
    const contacto = (formData.get("contacto") as string).trim() || null
    const numero_contacto = (formData.get("numero_contacto") as string).trim() || null

    if (!id || !nombre) return { error: "ID y Nombre son obligatorios" }
    if (id.length > 20) return { error: "El ID no puede superar 20 caracteres" }

    const { error } = await supabase.from("entidades").insert({
      id, nombre, direccion, contacto, numero_contacto,
    })

    if (error) {
      if (error.code === "23505") return { error: "Ya existe una entidad con ese ID" }
      return { error: error.message }
    }

    revalidatePath("/entidades")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function actualizarEntidad(
  _prev: EntidadFormState,
  formData: FormData
): Promise<EntidadFormState> {
  try {
    const supabase = await getAdminClient()

    const id = formData.get("id") as string
    const nombre = (formData.get("nombre") as string).trim()
    const direccion = (formData.get("direccion") as string).trim() || null
    const contacto = (formData.get("contacto") as string).trim() || null
    const numero_contacto = (formData.get("numero_contacto") as string).trim() || null

    if (!nombre) return { error: "El nombre es obligatorio" }

    const { error } = await supabase
      .from("entidades")
      .update({ nombre, direccion, contacto, numero_contacto })
      .eq("id", id)

    if (error) return { error: error.message }

    revalidatePath("/entidades")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
