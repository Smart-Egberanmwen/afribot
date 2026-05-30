'use client'
import { useParams } from 'next/navigation'
import InventoryView from '@/app/(dashboard)/inventory/_inventory-view'

export default function ClientInventoryPage() {
  const { clientId } = useParams<{ clientId: string }>()
  return <InventoryView clientId={clientId} />
}
