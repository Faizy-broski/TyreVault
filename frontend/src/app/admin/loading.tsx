export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-32 bg-zinc-200 rounded mb-5" />

      {/* Title + action buttons */}
      <div className="flex items-center justify-between mb-5">
        <div className="h-7 w-40 bg-zinc-200 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-zinc-200 rounded-lg" />
          <div className="h-9 w-32 bg-zinc-300 rounded-lg" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="h-8 w-28 bg-zinc-200 rounded-lg" />
        <div className="h-8 w-28 bg-zinc-200 rounded-lg" />
        <div className="h-8 w-28 bg-zinc-200 rounded-lg" />
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-100">
          <div className="h-4 w-8 bg-zinc-200 rounded" />
          <div className="h-4 w-24 bg-zinc-200 rounded" />
          <div className="h-4 flex-1 bg-zinc-100 rounded" />
          <div className="h-4 w-20 bg-zinc-200 rounded" />
          <div className="h-4 w-16 bg-zinc-200 rounded" />
        </div>
        {/* Skeleton rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-zinc-50">
            <div className="h-4 w-4 bg-zinc-100 rounded" />
            <div className="h-4 w-32 bg-zinc-100 rounded" />
            <div className="h-4 flex-1 bg-zinc-100 rounded" />
            <div className="h-4 w-16 bg-zinc-100 rounded" />
            <div className="h-6 w-20 bg-zinc-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
