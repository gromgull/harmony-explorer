import { ScoreView } from '@/components/ScoreView'
import { Toolbar } from '@/components/Toolbar'
import { useScoreStore } from '@/store/score'

export default function App() {
  const score = useScoreStore((s) => s.score)
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{score.title || 'Untitled'}</h1>
        <span className="text-muted-foreground text-sm">Harmony explorer</span>
      </header>
      <Toolbar />
      <ScoreView score={score} />
    </main>
  )
}
