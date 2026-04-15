import { Skeleton } from '@/components/ui/skeleton'

export default function AdminMantenimientoLoading() {
  return (
    <div className="space-y-6 pb-8">
      {/* Title */}
      <Skeleton className="h-8 w-56" />

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>

      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
