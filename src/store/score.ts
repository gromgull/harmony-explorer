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

export const useUndo = () => useScoreStore.temporal.getState()

// Handy for poking at the model from the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { scoreStore: useScoreStore })
