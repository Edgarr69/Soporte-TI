import { Skeleton } from '@/components/ui/skeleton'

export default function MantenimientoDetailLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      {/* Back + header */}
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Detalle + timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </main>
  )
}
