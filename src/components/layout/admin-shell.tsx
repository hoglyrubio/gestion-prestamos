"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"

interface AdminShellProps {
  children: React.ReactNode
  userEmail: string
  userName: string | null
  role: string
}

export function AdminShell({ children, userEmail, userName, role }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar
        userEmail={userEmail}
        userName={userName}
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar solo visible en móvil */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 flex-shrink-0 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-800 text-xl leading-none p-1"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <p className="text-sm font-bold text-slate-900">💰 GestiónPréstamos</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
