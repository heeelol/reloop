import type { Item } from './types'
import { co2ForCategory } from './impact'
import { offsetMeters } from './geo'

interface Seed {
  title: string
  description: string
  category: Item['category']
  imageUrl: string
  ownerName: string
  locationName: string
  north: number // meters from center
  east: number
  status?: Item['status']
  minutesAgo: number
}

const SEEDS: Seed[] = [
  {
    title: 'Solid oak dining chairs (x4)',
    description: 'Great condition, just moved and no space. First to come gets them.',
    category: 'Furniture',
    imageUrl:
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=70',
    ownerName: 'Maya',
    locationName: 'Elm Street',
    north: 320,
    east: 210,
    minutesAgo: 18,
  },
  {
    title: 'Working desktop monitor 24"',
    description: 'HDMI + VGA. Upgraded my setup, this one still runs perfectly.',
    category: 'Electronics',
    imageUrl:
      'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=600&q=70',
    ownerName: 'Devin',
    locationName: 'Maple Ave',
    north: -260,
    east: 480,
    minutesAgo: 45,
  },
  {
    title: 'Kids winter coats bundle',
    description: 'Age 5–7, outgrown but plenty of warmth left in them.',
    category: 'Clothing',
    imageUrl:
      'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=600&q=70',
    ownerName: 'Priya',
    locationName: 'Cedar Court',
    north: 540,
    east: -320,
    minutesAgo: 90,
  },
  {
    title: 'Box of sci-fi paperbacks',
    description: 'Asimov, Le Guin, and more. Take the whole box.',
    category: 'Books & Media',
    imageUrl:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=70',
    ownerName: 'Tom',
    locationName: 'Birch Lane',
    north: -410,
    east: -180,
    minutesAgo: 130,
  },
  {
    title: 'Wooden train set',
    description: 'All pieces there. Our kids loved it, hope yours do too.',
    category: 'Toys & Games',
    imageUrl:
      'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=600&q=70',
    ownerName: 'Sara',
    locationName: 'Oak Grove',
    north: 150,
    east: -520,
    status: 'claimed',
    minutesAgo: 220,
  },
  {
    title: 'Stand mixer (barely used)',
    description: 'Wedding gift duplicate. Works like new, all attachments.',
    category: 'Kitchen',
    imageUrl:
      'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=600&q=70',
    ownerName: 'Leo',
    locationName: 'Willow Way',
    north: -600,
    east: 260,
    minutesAgo: 260,
  },
  {
    title: 'Terracotta plant pots',
    description: 'Various sizes, a few with saucers. Great for herbs.',
    category: 'Garden',
    imageUrl:
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=70',
    ownerName: 'Nina',
    locationName: 'Rose Terrace',
    north: 430,
    east: 560,
    minutesAgo: 320,
  },
  {
    title: 'Acoustic guitar + soft case',
    description: 'A few scratches, tunes and plays great. Free to a good home.',
    category: 'Other',
    imageUrl:
      'https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&q=70',
    ownerName: 'Jo',
    locationName: 'Pine Street',
    north: -140,
    east: 90,
    minutesAgo: 400,
  },
]

export function generateMockItems(centerLat: number, centerLng: number): Item[] {
  const now = Date.now()
  return SEEDS.map((s, i) => {
    const { lat, lng } = offsetMeters(centerLat, centerLng, s.north, s.east)
    return {
      id: `mock-${i}`,
      title: s.title,
      description: s.description,
      category: s.category,
      imageUrl: s.imageUrl,
      lat,
      lng,
      locationName: s.locationName,
      co2Saved: co2ForCategory(s.category),
      status: s.status ?? 'available',
      createdAt: new Date(now - s.minutesAgo * 60_000).toISOString(),
      ownerName: s.ownerName,
    }
  })
}
