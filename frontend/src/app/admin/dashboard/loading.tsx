export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-zinc-50/50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-200 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="h-5 w-28 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-3 w-44 bg-zinc-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1.5">
          <div className="h-3.5 w-48 bg-zinc-200 rounded animate-pulse" />
          <div className="h-3 w-28 bg-zinc-200 rounded animate-pulse" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-sm">
            <div className="h-1.5 bg-zinc-200 animate-pulse" />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-zinc-200 rounded animate-pulse" />
                <div className="w-12 h-12 rounded-[14px] bg-zinc-200 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-8 w-32 bg-zinc-200 rounded-lg animate-pulse" />
                <div className="h-3.5 w-40 bg-zinc-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders + Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Orders table skeleton */}
        <div className="xl:col-span-2 rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-zinc-200 animate-pulse" />
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 mt-1.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-zinc-200 animate-pulse" />
              <div className="h-4 w-28 bg-zinc-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-zinc-200 rounded-xl animate-pulse" />
          </div>
          <div className="divide-y divide-zinc-100">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="px-6 py-4 flex items-center gap-6">
                <div className="h-3.5 w-20 bg-zinc-200 rounded animate-pulse" />
                <div className="h-3.5 w-24 bg-zinc-200 rounded animate-pulse" />
                <div className="h-3.5 w-16 bg-zinc-200 rounded animate-pulse" />
                <div className="h-5 w-14 bg-zinc-200 rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-zinc-200 rounded-md animate-pulse" />
                <div className="h-3.5 w-24 bg-zinc-200 rounded animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown skeleton */}
        <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-zinc-200 animate-pulse" />
          <div className="p-6 space-y-6 mt-1.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-zinc-200 animate-pulse" />
              <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-24 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-3.5 w-8 bg-zinc-200 rounded animate-pulse" />
                </div>
                <div className="h-2 bg-zinc-200 rounded-full animate-pulse" style={{ width: `${40 + i * 15}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
