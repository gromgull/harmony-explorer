import { produce, type Draft } from 'immer'
import { nanoid } from 'nanoid'
import type { ChordSpec } from './chord'
import { barTicks, scoreLength } from './time'
import {
  EIGHTH,
  QUARTER,
  type KeySignature,
  type Note,
  type NoteId,
  type Pitch,
  type Score,
  type Tick,
  type TimeSignature,
  type Voice,
} from './types'

export type EditOp =
  | { type: 'insertNote'; voiceId: string; start: Tick; duration: Tick; pitch: Pitch; id?: NoteId }
  | { type: 'moveNote'; noteId: NoteId; pitch: Pitch; start?: Tick }
  | { type: 'setDuration'; noteId: NoteId; duration: Tick }
  | { type: 'deleteNote'; noteId: NoteId }
  | { type: 'setLyric'; noteId: NoteId; lyric: string | undefined }
  | { type: 'setChord'; start: Tick; chord: ChordSpec | null }
  | { type: 'setKey'; key: KeySignature }
  | { type: 'setTimeSignature'; timeSignature: TimeSignature }
  | { type: 'setMeasureCount'; measureCount: number }
  | { type: 'setPickup'; pickup: Tick }
  | { type: 'setTempo'; tempo: number }
  | { type: 'setTitle'; title: string }

const snap = (t: Tick, grid: Tick) => Math.round(t / grid) * grid

function findNote(score: Draft<Score>, id: NoteId) {
  for (const voice of score.voices) {
    const note = voice.notes.find((n) => n.id === id)
    if (note) return { voice, note }
  }
  return null
}

/**
 * Places a note in a voice with "overwrite" semantics, as in MuseScore:
 * notes starting inside the new note's span are removed, and a note
 * sounding into it from before is shortened.
 */
function placeNote(voice: Draft<Voice>, note: Note, end: Tick) {
  note.duration = Math.min(note.duration, end - note.start)
  if (note.duration <= 0) return
  const noteEnd = note.start + note.duration
  voice.notes = voice.notes.filter((n) => n.id !== note.id && !(n.start >= note.start && n.start < noteEnd))
  for (const n of voice.notes) {
    if (n.start < note.start && n.start + n.duration > note.start) n.duration = note.start - n.start
  }
  voice.notes.push(note)
  voice.notes.sort((a, b) => a.start - b.start)
}

/** Removes or shortens everything that falls past the end of the score. */
function clampToLength(score: Draft<Score>) {
  const end = scoreLength(score)
  for (const voice of score.voices) {
    voice.notes = voice.notes.filter((n) => n.start < end)
    for (const n of voice.notes) n.duration = Math.min(n.duration, end - n.start)
  }
  score.chords = score.chords.filter((c) => c.start < end)
}

function apply(score: Draft<Score>, op: EditOp) {
  switch (op.type) {
    case 'insertNote': {
      const voice = score.voices.find((v) => v.id === op.voiceId)
      if (!voice) return
      const start = snap(op.start, EIGHTH)
      const duration = Math.max(EIGHTH, snap(op.duration, EIGHTH))
      placeNote(voice, { id: op.id ?? nanoid(), start, duration, pitch: op.pitch }, scoreLength(score))
      return
    }
    case 'moveNote': {
      const found = findNote(score, op.noteId)
      if (!found) return
      found.note.pitch = op.pitch
      if (op.start !== undefined) {
        const note = { ...found.note, start: snap(op.start, EIGHTH) }
        placeNote(found.voice, note, scoreLength(score))
      }
      return
    }
    case 'setDuration': {
      const found = findNote(score, op.noteId)
      if (!found) return
      const note = { ...found.note, duration: Math.max(EIGHTH, snap(op.duration, EIGHTH)) }
      placeNote(found.voice, note, scoreLength(score))
      return
    }
    case 'deleteNote': {
      for (const voice of score.voices) voice.notes = voice.notes.filter((n) => n.id !== op.noteId)
      return
    }
    case 'setLyric': {
      const found = findNote(score, op.noteId)
      if (found) found.note.lyric = op.lyric || undefined
      return
    }
    case 'setChord': {
      const start = snap(op.start, QUARTER)
      score.chords = score.chords.filter((c) => c.start !== start)
      if (op.chord) score.chords.push({ id: nanoid(), start, ...op.chord })
      score.chords.sort((a, b) => a.start - b.start)
      return
    }
    case 'setKey':
      score.key = op.key
      return
    case 'setTimeSignature': {
      // Notes keep their absolute positions; add bars so nothing falls off the end.
      score.timeSignature = op.timeSignature
      const lastEnd = Math.max(0, ...score.voices.flatMap((v) => v.notes.map((n) => n.start + n.duration)))
      const needed = Math.ceil((lastEnd - score.pickup) / barTicks(op.timeSignature))
      score.measureCount = Math.max(score.measureCount, needed)
      score.pickup = Math.min(score.pickup, barTicks(op.timeSignature) - EIGHTH)
      clampToLength(score)
      return
    }
    case 'setMeasureCount':
      score.measureCount = Math.max(1, Math.round(op.measureCount))
      clampToLength(score)
      return
    case 'setPickup': {
      // Shift content so that the downbeat of bar 1 keeps its music.
      const pickup = Math.max(0, Math.min(snap(op.pickup, EIGHTH), barTicks(score.timeSignature) - EIGHTH))
      const delta = pickup - score.pickup
      score.pickup = pickup
      for (const voice of score.voices) {
        for (const n of voice.notes) n.start += delta
        voice.notes = voice.notes.filter((n) => n.start >= 0)
      }
      for (const c of score.chords) c.start += delta
      score.chords = score.chords.filter((c) => c.start >= 0)
      clampToLength(score)
      return
    }
    case 'setTempo':
      score.tempo = Math.max(20, Math.min(300, Math.round(op.tempo)))
      return
    case 'setTitle':
      score.title = op.title
      return
  }
}

export const applyOp = (score: Score, op: EditOp): Score => produce(score, (draft) => apply(draft, op))
