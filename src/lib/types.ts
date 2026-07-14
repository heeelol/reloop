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
}

export interface AiAnalysis {
  category: Category
  title: string
  co2Saved: number
  reason: string
}
