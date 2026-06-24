export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-pulse bg-zinc-50/50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-5 w-44 bg-zinc-200 rounded-lg" />
            <div className="h-3 w-32 bg-zinc-100 rounded" />
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <div className="h-3 w-48 bg-zinc-100 rounded" />
          <div className="h-2.5 w-28 bg-zinc-100 rounded" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-sm">
            <div className="h-1.5 bg-zinc-200 w-full" />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 bg-zinc-100 rounded" />
                <div className="w-12 h-12 rounded-[14px] bg-zinc-100" />
              </div>
              <div className="h-8 w-36 bg-zinc-200 rounded-lg" />
              <div className="h-3 w-24 bg-zinc-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Orders table + breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 h-72 rounded-2xl bg-white border border-zinc-200 shadow-sm" />
        <div className="h-72 rounded-2xl bg-white border border-zinc-200 shadow-sm" />
      </div>
    </div>
  )
}
