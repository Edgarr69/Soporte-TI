import { redirect } from 'next/navigation'
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/admin/sistemas/tickets/${params.id}`)
}
