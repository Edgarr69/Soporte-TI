'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface GridPatternProps {
  width?: number
  height?: number
  x?: number
  y?: number
  strokeDasharray?: number
  numSquares?: number
  className?: string
  maxOpacity?: number
  duration?: number
  repeatDelay?: number
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: GridPatternProps) {
  const id = useId()
  const containerRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [squares, setSquares] = useState<Array<{ id: number; pos: [number, number]; rev: number }>>([])

  function getPos(dims: { width: number; height: number }): [number, number] {
    return [
      Math.floor((Math.random() * dims.width) / width),
      Math.floor((Math.random() * dims.height) / height),
    ]
  }

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return
    setSquares(
      Array.from({ length: numSquares }, (_, i) => ({
        id: i,
        pos: getPos(dimensions),
        rev: 0,
      }))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, numSquares])

  // Mueve un cuadrado aleatorio en cada ciclo de animación (reemplaza onAnimationComplete)
  useEffect(() => {
    if (!squares.length) return
    const intervalMs = ((duration + repeatDelay) * 1000) / numSquares
    const timer = setInterval(() => {
      setSquares(prev => {
        const idx = Math.floor(Math.random() * prev.length)
        return prev.map((sq, i) =>
          i === idx ? { ...sq, pos: getPos(dimensions), rev: sq.rev + 1 } : sq
        )
      })
    }, intervalMs)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squares.length, dimensions, duration, repeatDelay, numSquares])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => { if (containerRef.current) observer.unobserve(containerRef.current) }
  }, [])

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30',
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [sx, sy], id: sqId, rev }, index) => (
          <rect
            key={`${sqId}-${rev}`}
            width={width - 1}
            height={height - 1}
            x={sx * width + 1}
            y={sy * height + 1}
            fill="currentColor"
            strokeWidth="0"
            style={{
              animation: `grid-fade ${duration}s ease-in-out ${index * 0.1}s 1 both`,
            }}
          />
        ))}
      </svg>
    </svg>
  )
}

export default AnimatedGridPattern
