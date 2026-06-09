'use client'

import { cn } from '@/lib/utils'

interface BlurInProps {
  word: string
  className?: string
  variant?: {
    hidden: { filter: string; opacity: number }
    visible: { filter: string; opacity: number }
  }
  duration?: number
}

export function BlurIn({ word, className, duration = 1 }: BlurInProps) {
  return (
    <h1
      className={cn(className)}
      style={{
        animation: `blur-in ${duration}s ease-out forwards`,
        opacity: 0,
      }}
    >
      {word}
    </h1>
  )
}

export default BlurIn
