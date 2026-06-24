export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-7 w-48 bg-zinc-200 rounded mb-6" />
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="h-11 bg-zinc-100 border-b border-zinc-200" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-3 border-b border-zinc-100 last:border-0">
            <div className="h-4 w-32 bg-zinc-100 rounded" />
            <div className="h-4 flex-1 bg-zinc-100 rounded" />
            <div className="h-4 w-20 bg-zinc-100 rounded" />
            <div className="h-4 w-16 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
