import { Skeleton } from '@/components/ui/skeleton'

export default function NotificacionesLoading() {
  return (
    <div className="max-w-2xl w-full space-y-4">
      <Skeleton className="h-8 w-48" />
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  )
}
