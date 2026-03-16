import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'
import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>

export function LinkButton({ href, className, variant, size, children, ...props }: Props) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  )
}
