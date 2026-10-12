import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AdminShell } from "@/components/layout/admin-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, profile } = await getSession()

  if (!userId) redirect("/login")
  if (profile?.status === "REJECTED") redirect("/auth/rejected")
  if (!profile || profile.status === "PENDING") redirect("/pending")
  if (profile.status !== "ACTIVE" || profile.role !== "ADMIN") redirect("/")

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
