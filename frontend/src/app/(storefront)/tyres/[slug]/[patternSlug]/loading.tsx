import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>

      <Skeleton className="h-7 w-64 mb-2" />
      <Skeleton className="h-4 w-96 max-w-full mb-6" />

      {/* Sizes table */}
      <div className="mt-6 space-y-2">
        <Skeleton className="h-8 w-full rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    </main>
  )
}
