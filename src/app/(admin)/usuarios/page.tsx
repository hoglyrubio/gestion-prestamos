import { createClient } from "@/lib/supabase/server"
import { aprobarUsuario, rechazarUsuario, revocarAcceso } from "@/actions/usuarios"

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, created_at")
    .order("created_at", { ascending: false })

  const usuarios = profiles ?? []
  const total = usuarios.length
  const pendientes = usuarios.filter((u) => u.status === "PENDING").length
  const activos = usuarios.filter((u) => u.status === "ACTIVE").length

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Usuarios</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Aprueba solicitudes de acceso y administra roles
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total" value={total} sub="Registrados" />
        <StatCard label="Pendientes" value={pendientes} sub="Por aprobar" color="amber" />
        <StatCard label="Activos" value={activos} sub="Con acceso" color="green" />
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Gestión de usuarios</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Solicitó
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usuarios.map((u) => (
                <tr key={u.id} className={u.status === "PENDING" ? "bg-amber-50" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.full_name ?? u.email} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {u.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString("es-CO", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Actions userId={u.id} status={u.status} />
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay usuarios registrados aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-componentes ── */

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: number; sub: string; color?: "amber" | "green"
}) {
  const valueClass = color === "amber"
    ? "text-amber-600"
    : color === "green"
    ? "text-green-600"
    : "text-slate-900"

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueClass}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-xs text-slate-400">Sin rol</span>
  const colors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    PRESTAMISTA: "bg-blue-100 text-blue-700",
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] ?? "bg-slate-100 text-slate-600"}`}>
      {role}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    ACTIVE:   { label: "Activo",    class: "bg-green-100 text-green-700" },
    PENDING:  { label: "Pendiente", class: "bg-amber-100 text-amber-700" },
    REJECTED: { label: "Rechazado", class: "bg-red-100 text-red-700" },
  }
  const s = map[status] ?? { label: status, class: "bg-slate-100 text-slate-600" }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
      {s.label}
    </span>
  )
}

function Actions({ userId, status }: { userId: string; status: string }) {
  if (status === "PENDING") {
    return (
      <div className="flex gap-2 flex-wrap">
        <form action={aprobarUsuario.bind(null, userId, "PRESTAMISTA")}>
          <button className="px-3 py-1.5 rounded-md bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition cursor-pointer">
            ✓ Aprobar
          </button>
        </form>
        <form action={rechazarUsuario.bind(null, userId)}>
          <button className="px-3 py-1.5 rounded-md bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition cursor-pointer">
            ✕ Rechazar
          </button>
        </form>
      </div>
    )
  }

  if (status === "ACTIVE") {
    return (
      <form action={revocarAcceso.bind(null, userId)}>
        <button className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 transition cursor-pointer">
          Revocar acceso
        </button>
      </form>
    )
  }

  return null
}
