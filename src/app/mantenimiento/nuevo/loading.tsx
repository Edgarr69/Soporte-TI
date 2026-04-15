import { Skeleton } from '@/components/ui/skeleton'

export default function NuevoMantenimientoLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <Skeleton className="h-8 w-56" />
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  )
}
