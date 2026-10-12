import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

// Sesión + perfil una sola vez por request (layout y page la comparten).
// getClaims verifica el JWT localmente: sin viaje a Supabase Auth.
export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub ?? null

  if (!userId) return { supabase, userId: null, profile: null }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name, email")
    .eq("id", userId)
    .single()

  return { supabase, userId, profile }
})
