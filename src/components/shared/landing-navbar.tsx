'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Navbar, NavbarContent, NavbarItem, Button,
} from '@heroui/react'
import { LogIn } from 'lucide-react'
import { LoginModal } from '@/components/auth/login-modal'

// ThemeToggle animado
function ThemeToggleIcon() {
  const { theme } = useTheme()
  const [mounted, setMounted]  = useState(false)
  const prefersReducedMotion   = useReducedMotion()
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="size-4" />

  const isLight = theme === 'light'
  const iconVariants = {
    visible: { opacity: 1, scale: 1,   rotate: 0   },
    hidden:  { opacity: 0, scale: 0.5, rotate: 180 },
  }
  const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeInOut' as const }

  return (
    <div className="flex items-center justify-center relative size-4">
      <motion.div className="absolute h-full flex items-center"
        variants={iconVariants} animate={isLight ? 'visible' : 'hidden'} transition={transition}>
        <svg viewBox="0 0 384 512" className="h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z" />
        </svg>
      </motion.div>
      <motion.div className="absolute h-full flex items-center"
        variants={iconVariants} animate={isLight ? 'hidden' : 'visible'} transition={transition}>
        <svg viewBox="0 0 512 512" className="h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm224 0a128 128 0 1 0 -256 0 128 128 0 1 0 256 0z" />
        </svg>
      </motion.div>
    </div>
  )
}

const PILL = 'gap-4 py-2 rounded-full border-small border-default-200/20 bg-background/60 px-2 shadow-medium backdrop-blur-sm backdrop-saturate-150 dark:bg-default-100/50'

export function LandingNavbar() {
  const { theme, setTheme }     = useTheme()
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  return (
    <>
      <Navbar
        shouldHideOnScroll
        isBlurred={false}
        className="bg-transparent py-2"
        classNames={{
          wrapper: 'px-0 w-full justify-center bg-transparent h-fit',
          menu: `mx-auto mt-3 max-h-[20vh] max-w-[80vw] rounded-large border-small border-default-200/20 bg-background/60 py-6 shadow-medium backdrop-blur-sm backdrop-saturate-150 dark:bg-default-100/50`,
        }}
      >
        {/* Pill 1: Logo */}
        <NavbarContent justify="center" className={PILL}>
          <NavbarItem>
            <Image
              src="/favicon.png"
              alt="Logo Soporte TI"
              width={38}
              height={38}
              className="rounded-full object-cover"
              priority
            />
          </NavbarItem>
        </NavbarContent>

        {/* Pill 2: Iniciar Sesión + Tema */}
        <NavbarContent justify="center" className={PILL}>
          <NavbarItem className="flex items-center gap-2">
            <Button
              variant="light"
              onPress={() => setIsLoginOpen(true)}
              startContent={<LogIn size={15} />}
              size="md"
            >
              <span className="hidden sm:inline">Iniciar Sesión</span>
              <span className="sm:hidden">Entrar</span>
            </Button>
            <Button
              isIconOnly
              variant="solid"
              className="bg-transparent size-10 md:size-7"
              aria-label={theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
              onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <ThemeToggleIcon />
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      {/* Modal login */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  )
}
