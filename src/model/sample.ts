import { nanoid } from 'nanoid'
import { parseChordSymbol } from './chord'
import { parsePitch } from './pitch'
import { barTicks } from './time'
import { EIGHTH, TPQ, type Chord, type Note, type Score } from './types'

const D: Record<string, number> = { '8': EIGHTH, q: TPQ, 'q.': TPQ * 1.5, h: TPQ * 2, 'h.': TPQ * 3, w: TPQ * 4 }

/**
 * Writes a melody as consecutive notes: "D4:q:A-" = pitch : duration : lyric (optional),
 * "r:h" = a rest.
 */
function melody(tokens: string, ...holds: [index: number, extra: number][]): Note[] {
  let t = 0
  const notes = tokens
    .trim()
    .split(/\s+/)
    .flatMap((tok) => {
      const [pitch, dur, lyric] = tok.split(':')
      const start = t
      t += D[dur]
      return pitch === 'r' ? [] : [{ id: nanoid(), start, duration: D[dur], pitch: parsePitch(pitch), lyric }]
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

/**
 * Keep on the Sunny Side (Blenkhorn/Entwisle, 1899; public domain), verse 1 and chorus.
 * Melody and chords after the abcnotation.com transcription (thornton.rose collection).
 */
export function keepOnTheSunnySide(): Score {
  const timeSignature = { beats: 4, beatUnit: 4 } as const
  const pickup = TPQ * 2
  const notes = melody(
    `G4:q:There's G4:q:a
     G4:h:dark A4:q:and B4:q:a
     A4:q:trou- G4:q:bled F#4:q:side E4:q:of
     D4:w:life
     r:h G4:q:There's B4:q:a
     D5:h:bright D5:q:and E5:q:a
     D5:q:sun- B4:q:ny A4:q:side G4:q
     A4:w:too
     r:h A4:q:Though B4:q:we
     C5:h:meet B4:q:with A4:q:the
     D5:h.:dark- B4:q:ness
     A4:h:and G4:h:strife
     r:h r:q G4:q:The
     A4:h:sun- A4:q:ny G4:q:side
     F#4:q:we D4:q:al- E4:q:so F#4:q:may
     G4:h.:view r:q

     D5:h:Keep D5:q:on E5:q:the
     D5:q:sun- B4:q:ny A4:h:side
     G4:q:al- G4:q:ways G4:q:on A4:q:the
     G4:q:sun- G4:q:ny F#4:q:side E4:q
     D4:h:keep G4:q:on A4:q:the
     B4:q:sun- B4:q:ny C5:q:side B4:q:of
     A4:w:life
     r:h B4:q:It D5:q:will
     E5:q:help D5:q:us D5:q:ev'- E5:q:ry
     B4:h:day A4:q:it G4:q:will
     A4:q:bright- G4:q:en G4:q:all E4:q:the
     D4:h:way G4:q:if A4:q:we'll
     B4:h:keep C5:q:on C5:q:the
     B4:q:sun- B4:q:ny A4:q:side F#4:q:of
     G4:h.:life r:q`,
  )
  return {
    version: 1,
    title: 'Keep on the Sunny Side',
    timeSignature,
    key: { tonic: { step: 'G', alter: 0 }, mode: 'major' },
    tempo: 110,
    pickup,
    measureCount: 30,
    chords: chords(pickup, barTicks(timeSignature), [
      // verse
      'G', 'C', 'G', 'G', 'G', 'G', 'D', 'D', 'D', 'D', 'G', 'G', 'D', 'D', 'G',
      // chorus
      'G', 'G', 'C', 'G', 'G', 'G', 'D', 'D', 'G', 'G', 'C', 'G', 'G C:3', 'G D:3', 'G',
    ]),
    voices: [
      { id: 'lead', role: 'lead', name: 'Lead', clef: 'treble', notes, source: { kind: 'manual' } },
    ],
  }
}

/**
 * Bury Me Beneath the Willow (traditional; Carter Family 1927), verse 1 and chorus.
 * Melody and chords after the abcnotation.com transcription (rlwalker collection),
 * transposed from D to G. A slur in the source becomes a note without a syllable.
 */
export function buryMeBeneathTheWillow(): Score {
  const timeSignature = { beats: 4, beatUnit: 4 } as const
  const pickup = EIGHTH
  const notes = melody(
    `D4:8:My
     B4:q.:heart C5:8:is B4:q:sad B4:8:and A4:8
     G4:q.:I A4:8:am G4:q:lone- E4:q:ly
     D4:q:For G4:8:the A4:8:on- B4:8:ly B4:8:one C5:8:I B4:8
     A4:w:love
     B4:q.:When C5:8:shall B4:q:I B4:8:see A4:8:him
     G4:q.:oh A4:8:no G4:q:nev- E4:q:er
     B4:q.:'Til C5:8:we B4:8:meet D4:8:in A4:8:heav'n A4:8:a-
     G4:w:bove

     D5:q.:Bur- E5:8:y D5:q:me B4:8:be- A4:8
     G4:q.:neath A4:8:the G4:q:wil- E4:q:low
     D4:q:Un- G4:8:der A4:8:the B4:8:weep- B4:8:ing C5:8:wil- B4:8:low
     A4:w:tree
     D5:q.:So E5:8:he D5:q:may B4:8:know A4:8:where
     G4:q.:I A4:8:am G4:q:sleep- E4:q:ing
     B4:q.:And C5:8:per- B4:8:haps D4:8:he'll A4:8:weep A4:8:for
     G4:w:me`,
  )
  const progression = ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G']
  return {
    version: 1,
    title: 'Bury Me Beneath the Willow',
    timeSignature,
    key: { tonic: { step: 'G', alter: 0 }, mode: 'major' },
    tempo: 100,
    pickup,
    measureCount: 16,
    chords: chords(pickup, barTicks(timeSignature), [...progression, ...progression]), // verse, chorus
    voices: [
      { id: 'lead', role: 'lead', name: 'Lead', clef: 'treble', notes, source: { kind: 'manual' } },
    ],
  }
}

/** A blank page: four empty bars of 4/4 in G. */
export function emptyScore(): Score {
  return {
    version: 1,
    title: 'Untitled',
    timeSignature: { beats: 4, beatUnit: 4 },
    key: { tonic: { step: 'G', alter: 0 }, mode: 'major' },
    tempo: 100,
    pickup: 0,
    measureCount: 6,
    chords: [],
    voices: [{ id: 'lead', role: 'lead', name: 'Lead', clef: 'treble', notes: [], source: { kind: 'manual' } }],
  }
}

export const EXAMPLES = [
  { title: 'Amazing Grace', make: amazingGrace },
  { title: 'Keep on the Sunny Side', make: keepOnTheSunnySide },
  { title: 'Bury Me Beneath the Willow', make: buryMeBeneathTheWillow },
]
