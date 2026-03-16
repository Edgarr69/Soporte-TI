import { LandingNavbar } from '@/components/shared/landing-navbar'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { BlurIn } from '@/components/ui/blur-in'
import { cn } from '@/lib/utils'

export default function Home() {
  return (
    <div className="text-foreground bg-white dark:bg-zinc-950 h-dvh overflow-hidden">

      <div className="h-dvh relative">

        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={1.1}
          duration={1}
          repeatDelay={4}
          className={cn(
            '[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[-45%] h-[200%] skew-y-12',
          )}
        />

        {/* Navbar pill encima del grid */}
        <div className="relative z-20">
          <LandingNavbar />
        </div>

        <div className="flex flex-col items-center justify-center h-full text-center -mt-16">
          <BlurIn
            word="Soporte TI"
            className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-6xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10"
            duration={1.5}
            variant={{
              hidden:  { filter: 'blur(15px)', opacity: 0 },
              visible: { filter: 'blur(0px)',  opacity: 1 },
            }}
          />
          <br />
          <BlurIn
            word="Sistema de gestión de tickets"
            className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-2xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10"
            duration={1.5}
            variant={{
              hidden:  { filter: 'blur(15px)', opacity: 0 },
              visible: { filter: 'blur(0px)',  opacity: 1 },
            }}
          />
        </div>
      </div>

    </div>
  )
}
