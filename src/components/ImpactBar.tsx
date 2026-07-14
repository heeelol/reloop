import { useCountUp } from '../hooks/useCountUp'
import { co2Equivalent, formatCo2 } from '../lib/impact'

interface Props {
  totalCo2: number
  rehomed: number
  active: number
}

function Stat({
  value,
  label,
  hint,
}: {
  value: string
  label: string
  hint?: string
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-extrabold tabular-nums text-loop-700 sm:text-2xl">
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

  return (
    <div className="flex items-center gap-6 border-b border-loop-100 bg-loop-50/70 px-4 py-3 sm:gap-10 sm:px-6">
      <Stat
        value={formatCo2(co2)}
        label="CO₂ kept out of the air"
        hint={co2Equivalent(totalCo2)}
      />
      <Stat value={Math.round(homed).toString()} label="items rehomed" />
      <Stat value={Math.round(live).toString()} label="available now" />
    </div>
  )
}
