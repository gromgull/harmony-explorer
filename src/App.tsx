import { ProjectMenu } from '@/components/ProjectMenu'
import { ScoreView } from '@/components/ScoreView'
import { TitleInput } from '@/components/TitleInput'
import { useEffect } from 'react'
import { Toolbar } from '@/components/Toolbar'
import { Transport } from '@/components/Transport'
import { VoicesPanel } from '@/components/VoicesPanel'
import { warmUp } from '@/playback/player'
import { clearSelection } from '@/editor/commands'
import { useKeyboard } from '@/editor/keyboard'
import { useScoreStore } from '@/store/score'

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">{children}</kbd>
)

export default function App() {
  const score = useScoreStore((s) => s.score)
  useKeyboard()
  // Audio may only start after a user gesture; load the sounds on the first one.
  useEffect(() => {
    window.addEventListener('pointerdown', warmUp, { once: true })
    window.addEventListener('keydown', warmUp, { once: true })
    // Selected notes are coloured; print them plain.
    window.addEventListener('beforeprint', clearSelection)
    return () => {
      window.removeEventListener('pointerdown', warmUp)
      window.removeEventListener('keydown', warmUp)
      window.removeEventListener('beforeprint', clearSelection)
    }
  }, [])
  // Printing shows only the title and the score.
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6 print:max-w-none print:p-0">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2 print:flex-1 print:justify-center">
          <div className="print:hidden">
            <ProjectMenu />
          </div>
          <TitleInput />
        </div>
        <div className="print:hidden">
          <Transport />
        </div>
      </header>
      <div className="print:hidden">
        <Toolbar />
      </div>
      <p className="text-muted-foreground -mt-2 text-xs leading-6 print:hidden">
        Click to add notes, drag to change pitch. Click above the staff for chords, below the lead for lyrics. <Kbd>3</Kbd>–<Kbd>6</Kbd>{' '}
        duration · <Kbd>.</Kbd> dot · <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> semitone · <Kbd>←</Kbd>
        <Kbd>→</Kbd> select · <Kbd>Del</Kbd> delete · <Kbd>⌘Z</Kbd> undo · <Kbd>Space</Kbd> play
      </p>
      <div className="print:hidden">
        <VoicesPanel />
      </div>
      <ScoreView score={score} />
    </main>
  )
}
