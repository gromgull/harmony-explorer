import { diatonicIndex } from '@/model/pitch'
import type { Clef, Tick } from '@/model/types'

/** Linear interpolation over a sorted [tick, x] table. */
export function interpolateX(ticks: [Tick, number][], tick: Tick) {
  for (let i = 0; i < ticks.length - 1; i++) {
    const [t0, x0] = ticks[i]
    const [t1, x1] = ticks[i + 1]
    if (tick >= t0 && tick <= t1) return x0 + ((tick - t0) / (t1 - t0 || 1)) * (x1 - x0)
  }
  return ticks.at(-1)![1]
}

/** Diatonic index of the pitch written on the top staff line (sounding pitch). */
export const topLineIndex = (clef: Clef) =>
  clef === 'bass'
    ? diatonicIndex({ step: 'A', octave: 3 })
    : diatonicIndex({ step: 'F', octave: clef === 'treble8' ? 4 : 5 })

/** Offset from a note's x (left edge, as VexFlow reports it) to its notehead centre. */
export const HEAD_OFFSET = 6
