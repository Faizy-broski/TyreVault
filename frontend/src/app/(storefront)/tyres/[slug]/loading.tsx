import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="space-y-3">
          <Skeleton className="aspect-[4/3] rounded-2xl w-full" />
          <div className="flex gap-2">
            <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
            <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
            <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-5 w-32" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <Skeleton className="h-16 w-full rounded-xl" />

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
