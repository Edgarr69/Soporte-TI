import { Skeleton } from '@/components/ui/skeleton'

export default function NuevoTicketLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  )
}
