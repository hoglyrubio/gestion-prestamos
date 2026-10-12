import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"

export default async function RootPage() {
  const { userId, profile } = await getSession()

  if (!userId) redirect("/login")
  if (!profile || profile.status === "PENDING") redirect("/pending")
  if (profile.status === "REJECTED") redirect("/auth/rejected")

  if (profile.role === "ADMIN") redirect("/usuarios")
  if (profile.role === "PRESTAMISTA") redirect("/clientes")

  redirect("/pending")
}
