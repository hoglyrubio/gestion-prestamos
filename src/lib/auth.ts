import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

// Sesión + perfil una sola vez por request (layout y page la comparten).
// getClaims verifica el JWT localmente: sin viaje a Supabase Auth.
//
// Camino rápido: si el JWT ya trae user_role/user_status/user_full_name
// (Custom Access Token Hook, migración 20261012100000) no se consulta la BD.
// Compromiso: un acceso revocado sigue valiendo hasta que expire el JWT; las
// Server Actions revalidan contra la BD, así que las escrituras se bloquean al
// instante. Si el claim NO es ACTIVE (pendiente, recién aprobado, hook sin
// activar o token viejo) se consulta la BD para tener el estado fresco.
export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as Record<string, unknown> | undefined
  const userId = claims?.sub ? String(claims.sub) : null

  if (!userId || !claims) return { supabase, userId: null, profile: null }

  if (claims.user_status === "ACTIVE" && typeof claims.user_role === "string") {
    return {
      supabase,
      userId,
      profile: {
        role: claims.user_role,
        status: "ACTIVE",
        full_name: (claims.user_full_name as string | null) ?? null,
        email: String(claims.email ?? ""),
      },
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name, email")
    .eq("id", userId)
    .single()

  return { supabase, userId, profile }
})
