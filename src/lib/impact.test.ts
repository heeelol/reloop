import { describe, it, expect } from 'vitest'
import { co2ForCategory, formatCo2, co2Equivalent, co2Equivalents } from './impact'

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

  it('gives a fun, relatable single equivalent', () => {
    const e = co2Equivalent(19)
    expect(e).toContain('≈')
    expect(e).toMatch(
      /tree|mile|burger|shower|coffee|stream|balloon|charge|flight|car/,
    )
    // Very small amounts still resolve to something sensible.
    expect(co2Equivalent(0.05)).toContain('≈')
  })

  it('rotates through several equivalents for the community banner', () => {
    const list = co2Equivalents(1300)
    expect(list.length).toBeGreaterThan(3)
    expect(list.every((s) => s.includes('≈'))).toBe(true)
    expect(co2Equivalents(0)).toEqual([])
  })
})
