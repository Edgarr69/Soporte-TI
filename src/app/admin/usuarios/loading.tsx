import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUsuariosLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  )
}
