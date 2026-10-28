import { describe, expect, it } from 'vitest'
import { parseChordSymbol } from '@/model/chord'
import { parsePitch, pitchName } from '@/model/pitch'
import { amazingGrace } from '@/model/sample'
import { TPQ, type Chord } from '@/model/types'
import { harmonize, trioNotes } from './trio'

const score = amazingGrace() // key of G
const chord = (s: string): Chord => ({ id: '', start: 0, ...parseChordSymbol(s)! })
const trio = (lead: string, c: string, high = false) => {
  const t = trioNotes(parsePitch(lead), chord(c), score, { highBaritone: high })!
  return [pitchName(t.tenor), pitchName(t.baritone)]
}

describe('trioNotes', () => {
  it('completes a major triad: tenor above, baritone below', () => {
    expect(trio('G4', 'G')).toEqual(['B4', 'D4'])
    expect(trio('B4', 'G')).toEqual(['D5', 'G4'])
    expect(trio('D5', 'G')).toEqual(['G5', 'B4'])
  })

  it('leaves out the 5th of a seventh chord', () => {
    expect(trio('D4', 'D7')).toEqual(['F#4', 'C4'])
    expect(trio('A4', 'D7')).toEqual(['C5', 'F#4']) // lead on the 5th
  })

  it('spells from the chord, also outside the key', () => {
    expect(trio('E4', 'E7')).toEqual(['G#4', 'D4'])
    expect(trio('Bb4', 'Bb')).toEqual(['D5', 'F4'])
  })

  it('harmonizes passing tones in parallel, with the triad on the lead note', () => {
    expect(trio('A4', 'G')).toEqual(['C5', 'E4'])
  })

  it('can put the baritone above the tenor', () => {
    expect(trio('G4', 'G', true)).toEqual(['B4', 'D5'])
  })
})

describe('harmonize', () => {
  const at = (role: 'tenor' | 'baritone' | 'bass', bar: number) =>
    harmonize(score, role)
      .filter((n) => n.start >= score.pickup + (bar - 1) * 3 * TPQ && n.start < score.pickup + bar * 3 * TPQ)
      .map((n) => `${pitchName(n.pitch)}/${n.duration / TPQ}`)

  it('rests where there is no chord (the pickup)', () => {
    expect(harmonize(score, 'tenor')[0].start).toBe(score.pickup)
  })

  it('follows the lead rhythm', () => {
    expect(at('tenor', 1)).toEqual(['B4/2', 'D5/0.5', 'B4/0.5'])
    expect(at('baritone', 1)).toEqual(['D4/2', 'G4/0.5', 'D4/0.5'])
  })

  it('moves with a chord change under a held lead note', () => {
    // "me": D5 held from bar 7 (D) into bar 8 (D7). F#5 fits both chords and is held;
    // the baritone moves from A to the 7th, C.
    expect(at('tenor', 7)).toEqual(['F#5/5'])
    expect(at('baritone', 7)).toEqual(['A4/3'])
    expect(at('baritone', 8)).toEqual(['C5/2', 'F#4/1']) // then "I" (B, passing) over D7
  })

  it('puts the bass on the chord roots', () => {
    expect(at('bass', 1)).toEqual(['G2/2', 'G2/0.5', 'G2/0.5'])
    expect(at('bass', 3)).toEqual(['C3/2', 'C3/1'])
  })
})
