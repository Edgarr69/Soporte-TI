import { Skeleton } from '@/components/ui/skeleton'

export default function TecnicosLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  )
}
