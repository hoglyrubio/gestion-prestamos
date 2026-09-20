import Link from "next/link"

interface Props {
  page: number
  totalPages: number
}

export function Pagination({ page, totalPages }: Props) {
  if (totalPages <= 1) return null

  const prev = page - 1
  const next = page + 1

  // Páginas visibles: siempre muestra hasta 5 alrededor de la actual
  const pages: (number | "…")[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…")
    }
  }

  return (
    <div className="flex items-center justify-between px-1 pt-4">
      <p className="text-xs text-slate-400">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={`?page=${prev}`} disabled={page <= 1}>←</PageLink>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
          ) : (
            <PageLink key={p} href={`?page=${p}`} active={p === page}>{p}</PageLink>
          )
        )}
        <PageLink href={`?page=${next}`} disabled={page >= totalPages}>→</PageLink>
      </div>
    </div>
  )
}

function PageLink({
  href, children, active, disabled,
}: {
  href: string; children: React.ReactNode; active?: boolean; disabled?: boolean
}) {
  if (disabled) {
    return (
      <span className="px-2.5 py-1.5 rounded-lg text-sm text-slate-300 cursor-not-allowed">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className={[
        "px-2.5 py-1.5 rounded-lg text-sm transition",
        active
          ? "bg-blue-700 text-white font-medium"
          : "text-slate-600 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </Link>
  )
}
