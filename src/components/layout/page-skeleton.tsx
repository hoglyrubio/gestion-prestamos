// Skeleton genérico mostrado por loading.tsx mientras llegan los datos
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="mb-5">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-border last:border-0 bg-muted/40" />
        ))}
      </div>
    </div>
  )
}
