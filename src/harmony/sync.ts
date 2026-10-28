import type { Score } from '@/model/types'
import { harmonize, type HarmonyRole } from './trio'

/** Regenerates every harmony voice that has not been edited by hand. */
export function syncHarmonies(score: Score): Score {
  let changed = false
  const voices = score.voices.map((v) => {
    if (v.source.kind !== 'generated' || v.source.edited || v.role === 'lead') return v
    const notes = harmonize(score, v.role as HarmonyRole, { highBaritone: v.source.highBaritone })
    if (JSON.stringify(notes) === JSON.stringify(v.notes)) return v
    changed = true
    return { ...v, notes }
  })
  return changed ? { ...score, voices } : score
}
