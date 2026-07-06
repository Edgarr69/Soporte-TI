'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODULE_COLORS, MODULE_LABELS, type NotifItem } from './notif-detail-modal'

const POPUP_DURATION = 6000
const MAX_VISIBLE = 4

interface Props {
  popups: NotifItem[]
  onDismiss: (id: string) => void
  onOpen: (item: NotifItem) => void
}

export function NotificationToastStack({ popups, onDismiss, onOpen }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div className="fixed top-16 right-4 z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {popups.slice(0, MAX_VISIBLE).map((item) => (
          <NotificationToast key={item.id} item={item} onDismiss={onDismiss} onOpen={onOpen} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

function NotificationToast({ item, onDismiss, onOpen }: {
  item: NotifItem
  onDismiss: (id: string) => void
  onOpen: (item: NotifItem) => void
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), POPUP_DURATION)
    return () => clearTimeout(t)
  }, [item.id])

  const modColor = item.module ? (MODULE_COLORS[item.module] ?? MODULE_COLORS.global) : MODULE_COLORS.global
  const modLabel = item.module ? (MODULE_LABELS[item.module] ?? item.module) : 'General'

  return (
    <motion.div
      layout
      initial={{ scale: 0.9, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 40 }}
      className="pointer-events-auto relative rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg"
    >
      <button
        onClick={() => onOpen(item)}
        className="w-full text-left p-4 pr-8"
      >
        <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold', modColor)}>
          {modLabel}
        </span>
        <p className="mt-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
          {item.title}
        </p>
        {item.body && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{item.body}</p>
        )}
      </button>

      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Descartar notificación"
        className="absolute top-2 right-2 p-1 rounded-full text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
