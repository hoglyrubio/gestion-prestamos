"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

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
