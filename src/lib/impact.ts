import type { Category } from './types'

export const CATEGORIES: Category[] = [
  'Furniture',
  'Electronics',
  'Clothing',
  'Books & Media',
  'Toys & Games',
  'Kitchen',
  'Garden',
  'Other',
]

// Rough kg CO2e avoided by reusing an item instead of buying new + diverting it
// from landfill. Figures are conservative midpoints drawn from lifecycle-analysis
// literature (WRAP, EPA WARM) and are meant as illustrative estimates.
export const CO2_PER_CATEGORY: Record<Category, number> = {
  Furniture: 25,
  Electronics: 30,
  Clothing: 8,
  'Books & Media': 1.5,
  'Toys & Games': 3,
  Kitchen: 6,
  Garden: 10,
  Other: 5,
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  Furniture: '🛋️',
  Electronics: '🔌',
  Clothing: '👕',
  'Books & Media': '📚',
  'Toys & Games': '🧸',
  Kitchen: '🍳',
  Garden: '🌱',
  Other: '📦',
}

export function co2ForCategory(c: Category): number {
  return CO2_PER_CATEGORY[c] ?? CO2_PER_CATEGORY.Other
}

export function formatCo2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`
  if (kg >= 100) return `${Math.round(kg)} kg`
  return `${kg.toFixed(kg < 10 ? 1 : 0)} kg`
}

// Relatable equivalent. Avg passenger car ≈ 0.19 kg CO2e per km.
export function co2Equivalent(kg: number): string {
  const km = kg / 0.19
  if (km >= 1) return `≈ ${Math.round(km)} km not driven`
  const phoneCharges = kg / 0.008 // ~8 g CO2e per smartphone charge
  return `≈ ${Math.round(phoneCharges)} phone charges`
}

// Rotating relatable equivalents, computed from published factors so the
// numbers are defensible under questioning. Sources rendered in the UI:
//   EPA Greenhouse Gas Equivalencies — 0.393 kg CO₂/mile driven,
//   ~0.0124 kg/smartphone charge, urban tree ≈ 6 kg sequestered/year.
export function co2Equivalents(kg: number): string[] {
  const out: string[] = []
  const miles = kg / 0.393
  if (miles >= 1) out.push(`≈ ${Math.round(miles).toLocaleString()} miles not driven`)
  const treeYears = kg / 6
  if (treeYears >= 1)
    out.push(`≈ ${Math.round(treeYears).toLocaleString()} trees working for a year`)
  const charges = kg / 0.0124
  if (charges >= 1)
    out.push(`≈ ${Math.round(charges).toLocaleString()} phone charges`)
  const carYears = kg / 4290 // EPA: 4,290 kg = one car off the road for a year
  if (carYears >= 1)
    out.push(`≈ ${carYears.toFixed(1)} cars off the road for a year`)
  return out.length ? out : [co2Equivalent(kg)]
}
