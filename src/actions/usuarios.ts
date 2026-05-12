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

export async function aprobarUsuario(id: string, role: "PRESTAMISTA" | "ADMIN") {
  const supabase = await getAdminClient()

  const { error } = await supabase
    .from("profiles")
    .update({ status: "ACTIVE", role })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/usuarios")
}

export async function rechazarUsuario(id: string) {
  const supabase = await getAdminClient()

  const { error } = await supabase
    .from("profiles")
    .update({ status: "REJECTED", role: null })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/usuarios")
}

export async function revocarAcceso(id: string) {
  const supabase = await getAdminClient()

  const { error } = await supabase
    .from("profiles")
    .update({ status: "PENDING", role: null })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/usuarios")
}
