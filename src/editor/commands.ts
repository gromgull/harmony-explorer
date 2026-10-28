import { nanoid } from 'nanoid'
import { chordText, parseChordSymbol } from '@/model/chord'
import { stepChromatic } from '@/model/pitch'
import { firstBeatFrom, scoreLength } from '@/model/time'
import { EIGHTH, TPQ, type Note, type NoteId, type Pitch, type Tick } from '@/model/types'
import type { HarmonyRole } from '@/harmony/trio'
import { play, preview, stop } from '@/playback/player'
import { useEditorStore } from '@/store/editor'
import { usePlaybackStore } from '@/store/playback'
import { useScoreStore } from '@/store/score'

// Every user action goes through these, whether it comes from the mouse,
// the toolbar or the keyboard.

const score = () => useScoreStore.getState().score
const dispatch = (...args: Parameters<ReturnType<typeof useScoreStore.getState>['dispatch']>) =>
  useScoreStore.getState().dispatch(...args)
const editor = () => useEditorStore.getState()
const setEditor = useEditorStore.setState

export const DURATIONS = [
  { ticks: EIGHTH, label: 'Eighth', key: '3' },
  { ticks: TPQ, label: 'Quarter', key: '4' },
  { ticks: TPQ * 2, label: 'Half', key: '5' },
  { ticks: TPQ * 4, label: 'Whole', key: '6' },
] as const

const allNotes = () => score().voices.flatMap((v) => v.notes.map((n) => ({ voiceId: v.id, note: n })))
const selectedNotes = (): Note[] => {
  const ids = new Set(editor().selection)
  return allNotes().filter((n) => ids.has(n.note.id)).map((n) => n.note)
}

export function select(ids: NoteId[]) {
  const notes = allNotes().filter((n) => ids.includes(n.note.id))
  // Selecting a note makes its duration the one used for new notes (as in MuseScore).
  setEditor({ selection: ids, ...(notes.length === 1 ? { inputDuration: notes[0].note.duration } : {}) })
  if (notes.length === 1) preview(notes[0].note.pitch)
}

export const clearSelection = () => setEditor({ selection: [], chordEdit: null })

export function insertNote(voiceId: string, start: Tick, pitch: Pitch): NoteId {
  const id = nanoid()
  dispatch({ type: 'insertNote', voiceId, start, duration: editor().inputDuration, pitch, id })
  setEditor({ selection: [id] })
  preview(pitch)
  return id
}

export function movePitch(noteId: NoteId, pitch: Pitch) {
  const current = allNotes().find((n) => n.note.id === noteId)?.note.pitch
  if (current && current.step === pitch.step && current.alter === pitch.alter && current.octave === pitch.octave) return
  dispatch({ type: 'moveNote', noteId, pitch })
  preview(pitch)
}

/** Sets the input duration, and applies it to the selected notes. */
export function setDuration(ticks: Tick) {
  setEditor({ inputDuration: ticks })
  for (const n of selectedNotes()) dispatch({ type: 'setDuration', noteId: n.id, duration: ticks })
}

const DOTTABLE = new Set([TPQ, TPQ * 2]) // dotted quarter and dotted half fit the eighth grid

export function toggleDot() {
  const d = editor().inputDuration
  if (DOTTABLE.has(d)) setDuration(d * 1.5)
  else if (DOTTABLE.has(d / 1.5)) setDuration(d / 1.5)
}

export function deleteSelection() {
  for (const id of editor().selection) dispatch({ type: 'deleteNote', noteId: id })
  setEditor({ selection: [] })
}

export function transposeSelection(direction: 1 | -1) {
  for (const n of selectedNotes()) movePitch(n.id, stepChromatic(n.pitch, direction, score().key))
}

/** Moves the selection to the previous/next note in the same voice. */
export function selectAdjacent(direction: 1 | -1) {
  const [id] = editor().selection
  const voice = score().voices.find((v) => v.notes.some((n) => n.id === id)) ?? score().voices[0]
  const i = voice.notes.findIndex((n) => n.id === id)
  const next = i === -1 ? voice.notes[direction === 1 ? 0 : voice.notes.length - 1] : voice.notes[i + direction]
  if (next) select([next.id])
}

export function openChordEdit(tick: Tick) {
  setEditor({ chordEdit: { tick } })
}

export const closeChordEdit = () => setEditor({ chordEdit: null })

/** Sets (or with empty text, removes) the chord at a beat. Returns false if the symbol is not understood. */
export function setChordSymbol(tick: Tick, text: string): boolean {
  if (text.trim() === '') {
    if (!score().chords.some((c) => c.start === tick)) return true
    dispatch({ type: 'setChord', start: tick, chord: null })
    return true
  }
  const chord = parseChordSymbol(text)
  if (!chord) return false
  const existing = score().chords.find((c) => c.start === tick)
  if (existing && chordText(existing) === chordText(chord)) return true
  dispatch({ type: 'setChord', start: tick, chord })
  return true
}

/** The next beat for the chord input, or null at the end of the score. */
export function nextBeat(tick: Tick): Tick | null {
  const next = firstBeatFrom(score(), tick + 1)
  return next < scoreLength(score()) ? next : null
}

/** Plays from the selected note (or the start), or stops if playing. */
export function togglePlay() {
  if (usePlaybackStore.getState().status !== 'stopped') return stop()
  const [first] = selectedNotes().sort((a, b) => a.start - b.start)
  void play(score(), first?.start ?? 0)
}

export function setHarmony(role: HarmonyRole, enabled: boolean) {
  if (enabled) dispatch({ type: 'addHarmony', role })
  else {
    const voice = score().voices.find((v) => v.role === role)
    if (voice) dispatch({ type: 'removeVoice', voiceId: voice.id })
    setEditor({ selection: [] })
  }
}

export function regenerate(voiceId: string, highBaritone?: boolean) {
  dispatch({ type: 'regenerate', voiceId, highBaritone })
}

export const undo = () => useScoreStore.temporal.getState().undo()
export const redo = () => useScoreStore.temporal.getState().redo()
