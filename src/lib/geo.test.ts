import { describe, it, expect } from 'vitest'
import { distanceKm, formatDistance } from './geo'

describe('geo', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(37.77, -122.41, 37.77, -122.41)).toBe(0)
  })

  it('computes ~111 km per degree of latitude at the equator', () => {
    expect(distanceKm(0, 0, 0, 1)).toBeCloseTo(111.19, 0)
  })

  it('formats distance in m under 1 km, else km', () => {
    expect(formatDistance(0.175)).toBe('175 m away')
    expect(formatDistance(1.5)).toBe('1.5 km away')
  })
})
