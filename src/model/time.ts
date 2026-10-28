import { TPQ, type Score, type Tick, type TimeSignature } from './types'

export const barTicks = (ts: TimeSignature): Tick => ts.beats * TPQ

export const scoreLength = (score: Score): Tick =>
  score.pickup + score.measureCount * barTicks(score.timeSignature)

export type MeasureBounds = {
  index: number // 0-based position in the score
  number: number // printed bar number; the pickup is 0
  start: Tick
  end: Tick
  isPickup: boolean
}

export function measureBounds(score: Score): MeasureBounds[] {
  const bar = barTicks(score.timeSignature)
  const out: MeasureBounds[] = []
  if (score.pickup > 0) {
    out.push({ index: 0, number: 0, start: 0, end: score.pickup, isPickup: true })
  }
  for (let i = 0; i < score.measureCount; i++) {
    const start = score.pickup + i * bar
    out.push({ index: out.length, number: i + 1, start, end: start + bar, isPickup: false })
  }
  return out
}

/** Tick of the beat containing `tick`, measured from the measure start. */
export function beatStart(measureStart: Tick, tick: Tick): Tick {
  return measureStart + Math.floor((tick - measureStart) / TPQ) * TPQ
}
