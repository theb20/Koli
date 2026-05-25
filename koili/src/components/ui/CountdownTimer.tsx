import { useState, useEffect } from 'react'

interface TimeLeft {
  hours: number
  minutes: number
  seconds: number
  cs: number
}

function getTimeLeft(target: number): TimeLeft {
  const diff = Math.max(0, target - Date.now())
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    cs: Math.floor((diff % 1_000) / 10),
  }
}

function Segment({ value, digits = 2 }: { value: number; digits?: number }) {
  return (
    <span className="bg-[#0F172A] text-white font-bold text-sm px-2 py-1 rounded-lg min-w-[34px] text-center tabular-nums">
      {String(value).padStart(digits, '0')}
    </span>
  )
}

interface CountdownTimerProps {
  targetMs: number
}

export function CountdownTimer({ targetMs }: CountdownTimerProps) {
  const [t, setT] = useState(() => getTimeLeft(targetMs))

  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(targetMs)), 100)
    return () => clearInterval(id)
  }, [targetMs])

  return (
    <div className="flex items-center gap-1 text-slate-500 text-sm">
      <Segment value={t.hours} digits={3} />
      <span className="font-bold text-slate-400">:</span>
      <Segment value={t.minutes} />
      <span className="font-bold text-slate-400">:</span>
      <Segment value={t.seconds} />
      <span className="font-bold text-slate-400">:</span>
      <Segment value={t.cs} />
    </div>
  )
}
