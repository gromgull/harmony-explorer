import { temporal } from 'zundo'
import { create } from 'zustand'
import { applyOp, type EditOp } from '@/model/ops'
import { amazingGrace } from '@/model/sample'
import type { Score } from '@/model/types'

type ScoreStore = {
  score: Score
  dispatch: (op: EditOp) => void
}

export const useScoreStore = create<ScoreStore>()(
  temporal(
    (set) => ({
      score: amazingGrace(),
      dispatch: (op) => set((s) => ({ score: applyOp(s.score, op) })),
    }),
    { partialize: (s) => ({ score: s.score }), limit: 200 },
  ),
)

let transactionStart: Score | null = null

/** Groups the edits until `commitTransaction` into one undo step (e.g. a drag). */
export function beginTransaction() {
  transactionStart = useScoreStore.getState().score
  useScoreStore.temporal.getState().pause()
}

export function commitTransaction() {
  if (!transactionStart) return
  const start = transactionStart
  const end = useScoreStore.getState().score
  transactionStart = null
  if (end !== start) useScoreStore.setState({ score: start })
  useScoreStore.temporal.getState().resume()
  if (end !== start) useScoreStore.setState({ score: end })
}

// Handy for poking at the model from the browser console during development.
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { scoreStore: useScoreStore })
