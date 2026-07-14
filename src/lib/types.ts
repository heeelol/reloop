export type Category =
  | 'Furniture'
  | 'Electronics'
  | 'Clothing'
  | 'Books & Media'
  | 'Toys & Games'
  | 'Kitchen'
  | 'Garden'
  | 'Other'

export type ItemStatus = 'available' | 'claimed'

export interface Item {
  id: string
  title: string
  description: string
  category: Category
  imageUrl: string
  lat: number
  lng: number
  locationName: string
  co2Saved: number // kg CO2e avoided
  status: ItemStatus
  createdAt: string // ISO
  ownerName: string
  ownerId?: string | null
  claimedById?: string | null
}

export interface AiAnalysis {
  category: Category
  title: string
  co2Saved: number
  reason: string
}

export type NotificationType = 'match' | 'claim' | 'message'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  itemId: string | null
  read: boolean
  createdAt: string
}

export interface ChatMessage {
  id: string
  itemId: string
  senderId: string
  body: string
  createdAt: string
}

export interface LeaderRow {
  ownerName: string
  given: number
  co2: number
}
