import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminShell } from "@/components/layout/admin-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name, email")
    .eq("id", user.id)
    .single()

  if (!profile || profile.status !== "ACTIVE" || profile.role !== "ADMIN") {
    redirect("/")
  }

  return (
    <AdminShell
      userEmail={profile.email}
      userName={profile.full_name}
      role={profile.role}
    >
      {children}
    </AdminShell>
  )
}
