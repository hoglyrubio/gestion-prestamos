"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { calcularCuota } from "@/lib/calculos"

async function getAuthorizedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  const allowed =
    profile?.status === "ACTIVE" &&
    (profile?.role === "PRESTAMISTA" || profile?.role === "ADMIN")

  if (!allowed) throw new Error("Sin permisos")

  return { supabase, userId: user.id, role: profile!.role as string }
}

// ── Genera el próximo número PP##### ──────────────────────────────────────────
async function generarNumeroPP(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("prestamos")
    .select("numero")
    .like("numero", "PP%")
    .order("numero", { ascending: false })
    .limit(1)

  const last = data?.[0]?.numero ?? "PP00000"
  const lastNum = parseInt(last.replace("PP", ""), 10)
  return `PP${String(lastNum + 1).padStart(5, "0")}`
}

// ── Tipos ────────────────────────────────────────────────────────────────────
export type PrestamoFormState = {
  error?: string
  success?: boolean
}

// ── Crear préstamo ────────────────────────────────────────────────────────────
export async function crearPrestamo(
  _prev: PrestamoFormState,
  formData: FormData
): Promise<PrestamoFormState> {
  try {
    const { supabase, userId } = await getAuthorizedClient()

    const tipo = formData.get("tipo") as string
    const cliente_id = formData.get("cliente_id") as string
    const fecha = formData.get("fecha") as string
    const fecha_inicio = formData.get("fecha_inicio") as string
    const capital = parseFloat(formData.get("capital") as string)
    const tasa_interes = parseFloat(formData.get("tasa_interes") as string)
    const cuotas = parseInt(formData.get("cuotas") as string, 10)
    const foto_url = (formData.get("foto_url") as string) || null

    if (!tipo || !cliente_id || !fecha || !fecha_inicio) {
      return { error: "Todos los campos obligatorios deben estar completos" }
    }
    if (isNaN(capital) || capital <= 0) return { error: "El capital debe ser mayor a 0" }
    if (isNaN(tasa_interes) || tasa_interes <= 0) return { error: "La tasa debe ser mayor a 0" }
    if (isNaN(cuotas) || cuotas <= 0) return { error: "Las cuotas deben ser mayor a 0" }

    // Número: generado para PERSONAL, manual para LIBRANZA
    let numero: string
    if (tipo === "PERSONAL") {
      numero = await generarNumeroPP(supabase)
    } else {
      numero = (formData.get("numero") as string).trim()
      if (!numero) return { error: "El número de libranza es obligatorio" }
    }

    const valor_cuota = calcularCuota(capital, tasa_interes, cuotas)

    const { error } = await supabase.from("prestamos").insert({
      prestamista_id: userId,
      cliente_id,
      tipo,
      numero,
      fecha,
      capital,
      tasa_interes,
      cuotas,
      valor_cuota,
      fecha_inicio,
      estado: "ACTIVA",
      foto_url,
    })

    if (error) {
      if (error.code === "23505") return { error: "Ya existe un préstamo con ese número" }
      return { error: error.message }
    }

    revalidatePath("/prestamos")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Actualizar préstamo ───────────────────────────────────────────────────────
export async function actualizarPrestamo(
  _prev: PrestamoFormState,
  formData: FormData
): Promise<PrestamoFormState> {
  try {
    const { supabase } = await getAuthorizedClient()

    const id = formData.get("id") as string
    const capital = parseFloat(formData.get("capital") as string)
    const tasa_interes = parseFloat(formData.get("tasa_interes") as string)
    const cuotas = parseInt(formData.get("cuotas") as string, 10)
    const fecha = formData.get("fecha") as string
    const fecha_inicio = formData.get("fecha_inicio") as string
    const estado = formData.get("estado") as string
    const foto_url = (formData.get("foto_url") as string) || null

    if (isNaN(capital) || capital <= 0) return { error: "El capital debe ser mayor a 0" }
    if (isNaN(tasa_interes) || tasa_interes <= 0) return { error: "La tasa debe ser mayor a 0" }
    if (isNaN(cuotas) || cuotas <= 0) return { error: "Las cuotas deben ser mayor a 0" }

    const valor_cuota = calcularCuota(capital, tasa_interes, cuotas)

    const updateData: Record<string, unknown> = {
      capital, tasa_interes, cuotas, valor_cuota, fecha, fecha_inicio, estado,
    }
    if (foto_url) updateData.foto_url = foto_url

    const { error } = await supabase
      .from("prestamos")
      .update(updateData)
      .eq("id", id)

    if (error) return { error: error.message }

    revalidatePath("/prestamos")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
