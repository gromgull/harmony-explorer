import { ProjectMenu } from '@/components/ProjectMenu'
import { ScoreView } from '@/components/ScoreView'
import { SongSettings } from '@/components/SongSettings'
import { TitleInput } from '@/components/TitleInput'
import { useEffect } from 'react'
import { Toolbar } from '@/components/Toolbar'
import { Transport } from '@/components/Transport'
import { VoicesPanel } from '@/components/VoicesPanel'
import { warmUp } from '@/playback/player'
import { clearSelection } from '@/editor/commands'
import { useKeyboard } from '@/editor/keyboard'
import { useScoreStore } from '@/store/score'

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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2 print:flex-1 print:justify-center">
          <div className="print:hidden">
            <ProjectMenu />
          </div>
          <TitleInput />
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <SongSettings />
          <VoicesPanel />
          <div className="ml-2">
            <Transport />
          </div>
        </div>
      </header>
      <div className="print:hidden">
        <Toolbar />
      </div>
      <ScoreView score={score} />
    </main>
  )
}
