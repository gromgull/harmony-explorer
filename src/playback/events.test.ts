import { describe, expect, it } from 'vitest'
import { amazingGrace } from '@/model/sample'
import { TPQ } from '@/model/types'
import { scoreEvents, strumNotes } from './events'

describe('scoreEvents', () => {
  const score = amazingGrace()

  it('plays the melody in midi', () => {
    const lead = scoreEvents(score, 0, false)
    expect(lead.slice(0, 3).map((e) => e.midi)).toEqual([62, 67, 71]) // D4 G4 B4
  })

  it('plays boom-chuck-chuck in 3/4 with alternating bass', () => {
    const bar1 = scoreEvents(score).filter((e) => e.part !== 'voice' && e.tick < score.pickup + 3 * TPQ)
    expect(bar1.filter((e) => e.part === 'bass').map((e) => e.midi)).toEqual([43]) // G2
    expect(bar1.filter((e) => e.part === 'strum').length).toBe(6) // 2 strums × G B D
    const bar2Bass = scoreEvents(score).find((e) => e.part === 'bass' && e.tick === score.pickup + 3 * TPQ)
    expect(bar2Bass?.midi).toBe(50) // D3, the fifth
  })

  it('starts mid-note when playing from inside a note', () => {
    const [first] = scoreEvents(score, score.pickup + TPQ, false)
    expect(first).toMatchObject({ midi: 67, tick: score.pickup + TPQ, durationTicks: TPQ })
  })
})

describe('strumNotes', () => {
  it('voices a D7 above E3', () => {
    const d7 = { id: '', start: 0, root: { step: 'D', alter: 0 }, quality: '7' } as const
    expect(strumNotes(d7)).toEqual([54, 57, 60, 62]) // F#3 A3 C4 D4
  })
})
