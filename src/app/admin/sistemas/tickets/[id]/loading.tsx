import { Skeleton } from '@/components/ui/skeleton'

export default function AdminTicketDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back + header */}
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Detalle + acciones admin */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
