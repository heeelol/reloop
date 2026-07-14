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
