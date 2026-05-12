import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  if (!profile || profile.status === "PENDING") redirect("/pending")
  if (profile.status === "REJECTED") redirect("/login")

  if (profile.role === "ADMIN") redirect("/usuarios")
  if (profile.role === "PRESTAMISTA") redirect("/clientes")

  redirect("/pending")
}
