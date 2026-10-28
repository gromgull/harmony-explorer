import { nanoid } from 'nanoid'
import { parseChordSymbol } from './chord'
import { parsePitch } from './pitch'
import { barTicks } from './time'
import { EIGHTH, TPQ, type Chord, type Note, type Score } from './types'

const D: Record<string, number> = { '8': EIGHTH, q: TPQ, 'q.': TPQ * 1.5, h: TPQ * 2, 'h.': TPQ * 3, w: TPQ * 4 }

/** Writes a melody as consecutive notes: "D4:q:A-" = pitch : duration : lyric (optional). */
function melody(tokens: string, ...holds: [index: number, extra: number][]): Note[] {
  let t = 0
  const notes = tokens
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [pitch, dur, lyric] = tok.split(':')
      const note: Note = { id: nanoid(), start: t, duration: D[dur], pitch: parsePitch(pitch), lyric }
      t += note.duration
      return note
    })
  // Lengthen held notes and shift what follows, so ties across barlines can be written.
  for (const [i, extra] of holds) {
    notes[i].duration += extra
    for (const n of notes.slice(i + 1)) n.start += extra
  }
  return notes
}

/** One chord symbol per bar, "G:3" places a chord on beat 3 of the bar (1-based). */
function chords(pickup: number, bar: number, perBar: string[]): Chord[] {
  return perBar.flatMap((cell, i) =>
    cell.split(' ').map((sym) => {
      const [name, beat] = sym.split(':')
      const spec = parseChordSymbol(name)!
      return { id: nanoid(), start: pickup + i * bar + (Number(beat ?? 1) - 1) * TPQ, ...spec }
    }),
  )
}

export function amazingGrace(): Score {
  const timeSignature = { beats: 3, beatUnit: 4 } as const
  const pickup = TPQ
  const notes = melody(
    `D4:q:A-
     G4:h:maz- B4:8:ing G4:8
     B4:h:grace A4:q:how
     G4:h:sweet E4:q:the
     D4:h:sound D4:q:that
     G4:h:saved B4:8:a G4:8
     B4:h:wretch A4:q:like
     D5:h.:me
     B4:q:I
     D5:h:once B4:8:was G4:8
     B4:h:lost A4:q:but
     G4:h:now E4:q:am
     D4:h:found D4:q:was
     G4:h:blind B4:8:but G4:8
     B4:h:now A4:q:I
     G4:h.:see`,
    [15, TPQ * 2], // "me" is held into the next bar
  )
  return {
    version: 1,
    title: 'Amazing Grace',
    timeSignature,
    key: { tonic: { step: 'G', alter: 0 }, mode: 'major' },
    tempo: 90,
    pickup,
    measureCount: 15,
    chords: chords(pickup, barTicks(timeSignature), [
      'G', 'G', 'C', 'G', 'G', 'D', 'D', 'D7',
      'G', 'G', 'C', 'G', 'G', 'D D7:3', 'G',
    ]),
    voices: [
      { id: 'lead', role: 'lead', name: 'Lead', clef: 'treble', notes, source: { kind: 'manual' } },
    ],
  }
}
