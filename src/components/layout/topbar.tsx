"use client"

interface TopbarProps {
  title: string
  onMenuClick: () => void
  children?: React.ReactNode
}

export function Topbar({ title, onMenuClick, children }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-800 text-xl leading-none p-1"
        aria-label="Abrir menú"
      >
        ☰
      </button>
      <h1 className="text-[15px] font-semibold text-slate-900 flex-1">{title}</h1>
      {children}
    </header>
  )
}
