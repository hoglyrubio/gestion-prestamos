"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { signOut } from "@/actions/auth"

interface SidebarProps {
  userEmail: string
  userName: string | null
  role: string
  open: boolean
  onClose: () => void
}

const adminNav = [
  { href: "/usuarios", icon: "👥", label: "Usuarios" },
  { href: "/entidades", icon: "🏢", label: "Entidades" },
]

const prestamisteNav = [
  { href: "/clientes", icon: "👤", label: "Clientes" },
  { href: "/prestamos", icon: "📋", label: "Préstamos" },
  { href: "/pagos", icon: "💳", label: "Pagos" },
]

const comingSoon = [
  { icon: "📄", label: "Certificaciones" },
  { icon: "💼", label: "Inversionistas" },
  { icon: "📈", label: "Inversiones" },
  { icon: "🏦", label: "Liquidaciones" },
]

export function Sidebar({ userEmail, userName, role, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const initials = (userName ?? userEmail).slice(0, 2).toUpperCase()

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 flex flex-col transition-transform duration-250",
          "lg:static lg:translate-x-0 lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-800 flex-shrink-0">
          <p className="text-sm font-bold text-white">💰 GestiónPréstamos</p>
          <p className="text-xs text-slate-500 mt-0.5">Panel de administración</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {role === "ADMIN" && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Administración
              </p>
              {adminNav.map((item) => (
                <NavItem key={item.href} {...item} active={pathname === item.href} onClose={onClose} />
              ))}
            </>
          )}

          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Préstamos
          </p>
          {prestamisteNav.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} onClose={onClose} />
          ))}

          {comingSoon.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md text-slate-600 cursor-not-allowed text-sm"
            >
              <span className="w-4 text-center text-sm">{item.icon}</span>
              <span>{item.label}</span>
              <span className="ml-auto text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                Pronto
              </span>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-100 truncate">{userName ?? userEmail}</p>
              <p className="text-[10px] text-slate-500">{role}</p>
            </div>
            <form action={signOut}>
              <button
                title="Cerrar sesión"
                className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              >
                ↩
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}

function NavItem({
  href, icon, label, active, onClose,
}: {
  href: string; icon: string; label: string; active: boolean; onClose: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={[
        "flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-blue-700 text-white"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
      ].join(" ")}
    >
      <span className="w-4 text-center text-sm">{icon}</span>
      {label}
    </Link>
  )
}
