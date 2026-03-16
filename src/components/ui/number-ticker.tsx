"use client"

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const from = direction === "down" ? value : startValue
  const to   = direction === "down" ? startValue : value

  const [display, setDisplay] = useState(from)
  const rafRef       = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const DURATION     = 1400 // ms

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      startTimeRef.current = null

      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) startTimeRef.current = timestamp
        const elapsed  = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / DURATION, 1)
        // ease-out expo: llega rápido y se arrastra hasta el final
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        const current = from + (to - from) * eased
        setDisplay(Number(current.toFixed(decimalPlaces)))

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }, delay * 1000 + 80)

    return () => {
      clearTimeout(delayTimer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, startValue, direction, delay, decimalPlaces, from, to])

  return (
    <span className={cn("inline-block tabular-nums", className)} {...props}>
      {Intl.NumberFormat("es-MX", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(display)}
    </span>
  )
}
