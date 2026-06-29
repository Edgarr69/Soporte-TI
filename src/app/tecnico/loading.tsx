import { Skeleton } from '@/components/ui/skeleton'

export default function TecnicoLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-56" />
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}
