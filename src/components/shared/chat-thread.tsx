'use client'

import { useEffect, useRef } from 'react'
import { Loader2, Lock, MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatRelative } from '@/lib/utils'

export interface ChatMessage {
  id: string
  body: string
  created_at: string
  author_id?: string | null
  author?: { full_name?: string | null; email?: string | null } | null
  is_internal?: boolean
}

interface Props {
  messages: ChatMessage[]
  currentUserId: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitting?: boolean
  placeholder?: string
  className?: string
  showInternalToggle?: boolean
  isInternal?: boolean
  onInternalChange?: (checked: boolean) => void
}

export function ChatThread({
  messages, currentUserId, value, onChange, onSubmit, submitting = false,
  placeholder = 'Escribe un mensaje… (Enter para enviar)', className,
  showInternalToggle = false, isInternal = false, onInternalChange,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <Card className={cn('border-zinc-200 dark:border-zinc-800 flex flex-col', className)}>
      <CardHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5" />
          Mensajes
          {messages.length > 0 && (
            <span className="text-xs font-normal text-zinc-400">({messages.length})</span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto py-4 px-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-400 text-center">
              Sin mensajes aún.<br />Escribe uno para comenzar.
            </p>
          </div>
        )}

        {messages.map((c) => {
          const isMe     = c.author_id === currentUserId
          const internal = !!c.is_internal
          return (
            <div
              key={c.id}
              className={cn(
                'flex flex-col gap-0.5 max-w-[82%]',
                isMe ? 'ml-auto items-end' : 'mr-auto items-start',
              )}
            >
              {!isMe && (
                <span className="text-[11px] text-zinc-500 px-1 font-medium">
                  {c.author?.full_name ?? c.author?.email ?? '—'}
                </span>
              )}
              <div
                className={cn(
                  'flex items-start gap-1.5 px-3 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed',
                  internal
                    ? cn('bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-2xl', isMe ? 'rounded-br-sm' : 'rounded-bl-sm')
                    : isMe
                      ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-2xl rounded-bl-sm',
                )}
              >
                {internal && <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                <span>{c.body}</span>
              </div>
              <span className="text-[10px] text-zinc-400 px-1">
                {internal && <span className="text-amber-600 dark:text-amber-400 font-medium">Interno · </span>}
                {formatRelative(c.created_at)}
              </span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="flex flex-col gap-2 p-3 border-t border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        {showInternalToggle && (
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer self-start">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => onInternalChange?.(e.target.checked)}
              className="rounded"
            />
            <Lock className="h-3 w-3" /> Solo visible para admins
          </label>
        )}
        <div className="flex gap-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!submitting) onSubmit()
              }
            }}
            placeholder={placeholder}
            rows={2}
            disabled={submitting}
            className="flex-1 resize-none text-sm"
          />
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={submitting || !value.trim()}
            className="self-end"
            aria-label="Enviar mensaje"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}
