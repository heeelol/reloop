import confetti from 'canvas-confetti'

// A short, on-brand (green) confetti burst — fired when an item is rehomed.
export function celebrate() {
  const colors = ['#14b06e', '#38c988', '#aaefca', '#078d59']
  const defaults = { spread: 70, ticks: 80, gravity: 1, decay: 0.92, startVelocity: 32, colors }

  confetti({ ...defaults, particleCount: 40, origin: { x: 0.5, y: 0.6 }, scalar: 1 })
  confetti({ ...defaults, particleCount: 20, angle: 60, origin: { x: 0, y: 0.7 } })
  confetti({ ...defaults, particleCount: 20, angle: 120, origin: { x: 1, y: 0.7 } })
}
