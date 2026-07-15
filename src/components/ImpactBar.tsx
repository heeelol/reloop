import { useEffect, useMemo, useRef, useState } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { co2Equivalents, formatCo2 } from '../lib/impact'

interface Props {
  totalCo2: number
  rehomed: number
  active: number
}

function Stat({
  value,
  label,
  hint,
  pop,
}: {
  value: string
  label: string
  hint?: string
  pop?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span
        key={pop ? 'p' : 'n'}
        className={`text-xl font-extrabold tabular-nums text-loop-700 sm:text-2xl ${
          pop ? 'impact-pop' : ''
        }`}
      >
        {value}
      </span>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {hint && <span className="text-[11px] text-loop-600">{hint}</span>}
    </div>
  )
}

export default function ImpactBar({ totalCo2, rehomed, active }: Props) {
  const co2 = useCountUp(totalCo2)
  const homed = useCountUp(rehomed)
  const live = useCountUp(active)

  // Pulse the CO₂ figure whenever it grows (i.e. an item was just rehomed).
  const prev = useRef(totalCo2)
  const [pop, setPop] = useState(false)
  useEffect(() => {
    if (totalCo2 > prev.current) {
      setPop(true)
      const t = window.setTimeout(() => setPop(false), 650)
      prev.current = totalCo2
      return () => window.clearTimeout(t)
    }
    prev.current = totalCo2
  }, [totalCo2])

  // Rotate through published-factor equivalents so the impact stays tangible.
  const equivalents = useMemo(() => co2Equivalents(totalCo2), [totalCo2])
  const [eqIdx, setEqIdx] = useState(0)
  useEffect(() => {
    if (equivalents.length < 2) return
    const t = window.setInterval(
      () => setEqIdx((i) => (i + 1) % equivalents.length),
      3200,
    )
    return () => window.clearInterval(t)
  }, [equivalents.length])
  const equivalent = equivalents[eqIdx % equivalents.length]

  return (
    <div className="flex items-center gap-6 border-b border-loop-100 bg-loop-50/70 px-4 py-3 sm:gap-10 sm:px-6">
      <div className="flex flex-col">
        <span
          key={pop ? 'p' : 'n'}
          className={`text-xl font-extrabold tabular-nums text-loop-700 sm:text-2xl ${
            pop ? 'impact-pop' : ''
          }`}
        >
          {formatCo2(co2)}
        </span>
        <span className="text-xs font-medium text-gray-600">
          CO₂ kept out of the air
        </span>
        <span
          key={equivalent}
          className="animate-[fadeIn_0.4s_ease] text-[11px] font-medium text-loop-600"
          title="Computed from EPA Greenhouse Gas Equivalencies + WRAP lifecycle factors"
        >
          {equivalent}
        </span>
      </div>
      <Stat value={Math.round(homed).toString()} label="items rehomed" />
      <Stat value={Math.round(live).toString()} label="available now" />
    </div>
  )
}
