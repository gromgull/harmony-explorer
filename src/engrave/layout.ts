import { keyAlterations } from '@/model/pitch'
import { barTicks, measureBounds, type MeasureBounds } from '@/model/time'
import { EIGHTH, TPQ, type Alter, type Note, type NoteId, type Pitch, type Score, type Tick, type Voice } from '@/model/types'

/** One engraved symbol: a note (or a tied piece of one) or a rest. */
export type Tickable = {
  kind: 'note' | 'rest'
  start: Tick
  duration: Tick
  code: DurationCode
  dots: 0 | 1
  noteId?: NoteId
  pitch?: Pitch
  tieToNext?: boolean
  accidental?: Alter // set when an accidental must be printed
  lyric?: string
}

export type DurationCode = '8' | 'q' | 'h' | 'w'

export type MeasureLayout = MeasureBounds & {
  voices: { voiceId: string; tickables: Tickable[] }[]
}

const NOTE_VALUES: { ticks: Tick; code: DurationCode; dots: 0 | 1 }[] = [
  { ticks: TPQ * 4, code: 'w', dots: 0 },
  { ticks: TPQ * 3, code: 'h', dots: 1 },
  { ticks: TPQ * 2, code: 'h', dots: 0 },
  { ticks: TPQ * 1.5, code: 'q', dots: 1 },
  { ticks: TPQ, code: 'q', dots: 0 },
  { ticks: EIGHTH, code: '8', dots: 0 },
]

/** Splits a note span into printable values, largest first. */
export function splitNoteSpan(length: Tick) {
  const out: (typeof NOTE_VALUES)[number][] = []
  let rest = length
  while (rest >= EIGHTH) {
    const v = NOTE_VALUES.find((v) => v.ticks <= rest)!
    out.push(v)
    rest -= v.ticks
  }
  return out
}

/**
 * Splits a rest span so each rest starts on a multiple of its own length
 * (half rests on beat 1 or 3, quarter rests on the beat, ...).
 * A completely empty full bar gets a single bar rest.
 */
export function splitRestSpan(offset: Tick, length: Tick, measureLength: Tick, isFullBar: boolean) {
  if (isFullBar && offset === 0 && length === measureLength) {
    return [NOTE_VALUES.find((v) => v.ticks === measureLength)!]
  }
  const out: (typeof NOTE_VALUES)[number][] = []
  let pos = offset
  const end = offset + length
  while (end - pos >= EIGHTH) {
    const v = NOTE_VALUES.find((v) => v.dots === 0 && v.ticks <= end - pos && pos % v.ticks === 0)!
    out.push(v)
    pos += v.ticks
  }
  return out
}

function layoutVoice(score: Score, voice: Voice, m: MeasureBounds): Tickable[] {
  const out: Tickable[] = []
  const keyAlter = keyAlterations(score.key)
  const current = new Map<string, Alter>() // accidental state within the bar
  const measureLength = m.end - m.start
  const isFullBar = measureLength === barTicks(score.timeSignature)

  const pushRest = (from: Tick, to: Tick) => {
    let t = from
    for (const v of splitRestSpan(from - m.start, to - from, measureLength, isFullBar)) {
      out.push({ kind: 'rest', start: t, duration: v.ticks, code: v.code, dots: v.dots })
      t += v.ticks
    }
  }

  const pushNote = (note: Note) => {
    const from = Math.max(note.start, m.start)
    const to = Math.min(note.start + note.duration, m.end)
    const isContinuation = note.start < m.start
    const { step, octave, alter } = note.pitch
    const key = `${step}${octave}`
    const showAccidental = !isContinuation && (current.get(key) ?? keyAlter[step]) !== alter
    current.set(key, alter)

    let t = from
    splitNoteSpan(to - from).forEach((v, i) => {
      out.push({
        kind: 'note',
        start: t,
        duration: v.ticks,
        code: v.code,
        dots: v.dots,
        noteId: note.id,
        pitch: note.pitch,
        tieToNext: t + v.ticks < note.start + note.duration,
        ...(i === 0 && showAccidental ? { accidental: alter } : {}),
        ...(i === 0 && !isContinuation && note.lyric ? { lyric: note.lyric } : {}),
      })
      t += v.ticks
    })
  }

  let cursor = m.start
  for (const note of voice.notes) {
    if (note.start >= m.end || note.start + note.duration <= m.start) continue
    if (note.start > cursor) pushRest(cursor, note.start)
    pushNote(note)
    cursor = Math.min(note.start + note.duration, m.end)
  }
  if (cursor < m.end) pushRest(cursor, m.end)
  return out
}

export function layoutScore(score: Score): MeasureLayout[] {
  return measureBounds(score).map((m) => ({
    ...m,
    voices: score.voices.map((v) => ({ voiceId: v.id, tickables: layoutVoice(score, v, m) })),
  }))
}
