// ---- time ----
export const TPQ = 480 // ticks per quarter note
export const EIGHTH = TPQ / 2 // note input grid
export const QUARTER = TPQ // chord input grid
export type Tick = number

export type TimeSignature = { beats: 3 | 4; beatUnit: 4 }

// ---- pitch ----
export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Alter = -2 | -1 | 0 | 1 | 2
export type PitchClass = { step: Step; alter: Alter }
export type Pitch = PitchClass & { octave: number } // C4 = middle C

export type KeySignature = { tonic: PitchClass; mode: 'major' | 'minor' }

// ---- content ----
export type NoteId = string

export type Note = {
  id: NoteId
  start: Tick
  duration: Tick // multiple of EIGHTH; may cross barlines (rendered as ties)
  pitch: Pitch
  lyric?: string // a trailing '-' means the word continues on the next syllable
}

export type VoiceRole = 'lead' | 'tenor' | 'baritone' | 'bass'
export type Clef = 'treble' | 'treble8' | 'bass'

export type Voice = {
  id: string
  role: VoiceRole
  name: string
  clef: Clef
  notes: Note[] // sorted by start, never overlapping; gaps are rests
  source: { kind: 'manual' } | { kind: 'generated'; algorithm: string; seed?: number }
}

export type Chord = {
  id: string
  start: Tick // multiple of QUARTER; lasts until the next chord
  root: PitchClass
  quality: string // tonal.js chord type symbol: '', 'm', '7', 'sus4', ...
  bass?: PitchClass // slash chord
}

export type Score = {
  version: 1
  title: string
  timeSignature: TimeSignature
  key: KeySignature
  tempo: number // quarter-note BPM
  pickup: Tick // length of the pickup bar, 0 = none
  measureCount: number // full measures, excluding the pickup
  chords: Chord[] // sorted by start
  voices: Voice[]
}
