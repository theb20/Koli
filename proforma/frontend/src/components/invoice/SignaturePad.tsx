import { useRef, useState, useEffect } from 'react'
import { Eraser } from '../ui/Icon'

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * ratio
    canvas.height = canvas.clientHeight * ratio
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
  }, [])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setDrawing(true)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  function end() {
    setDrawing(false)
    if (hasDrawn && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'))
    }
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative border border-dashed border-border bg-gray-50">
        <canvas
          ref={canvasRef}
          className="h-32 w-full cursor-crosshair touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={() => drawing && end()}
        />
        {!hasDrawn && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted">Signez ici avec la souris ou le doigt</p>}
      </div>
      {hasDrawn && (
        <button type="button" onClick={clear} className="flex w-fit items-center gap-1 text-[11px] font-medium text-muted hover:text-danger">
          <Eraser size={11} /> Effacer
        </button>
      )}
    </div>
  )
}
