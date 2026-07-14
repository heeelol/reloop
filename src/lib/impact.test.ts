import { describe, it, expect } from 'vitest'
import { co2ForCategory, formatCo2, co2Equivalent } from './impact'

describe('impact', () => {
  it('maps categories to CO2 values', () => {
    expect(co2ForCategory('Furniture')).toBe(25)
    expect(co2ForCategory('Electronics')).toBe(30)
    expect(co2ForCategory('Other')).toBe(5)
  })

  it('formats CO2 with sensible units', () => {
    expect(formatCo2(1240)).toBe('1.2 t')
    expect(formatCo2(150)).toBe('150 kg')
    expect(formatCo2(30)).toBe('30 kg')
    expect(formatCo2(8)).toBe('8.0 kg')
  })

  it('gives a relatable driving equivalent', () => {
    expect(co2Equivalent(19)).toBe('≈ 100 km not driven')
    expect(co2Equivalent(0.1)).toContain('phone charges')
  })
})
