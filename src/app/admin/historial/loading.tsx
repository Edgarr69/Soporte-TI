import { Skeleton } from '@/components/ui/skeleton'

export default function AdminHistorialLoading() {
  return (
    <div className="max-w-3xl w-full space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  )
}
