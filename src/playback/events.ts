import { Chord as TonalChord, Note as TonalNote } from 'tonal'
import { pitchClassName, toMidi } from '@/model/pitch'
import { barTicks, measureBounds, scoreLength } from '@/model/time'
import { TPQ, type Chord, type PitchClass, type Score, type Tick } from '@/model/types'

export type PlaybackEvent = {
  part: 'voice' | 'bass' | 'strum'
  voiceId?: string
  noteId?: string
  midi: number
  tick: Tick
  durationTicks: Tick
  velocity: number
  strumIndex?: number // position in the strum, lowest string first
}

export const ticksToSeconds = (ticks: Tick, tempo: number) => (ticks / TPQ) * (60 / tempo)
export const secondsToTicks = (seconds: number, tempo: number) => (seconds * tempo * TPQ) / 60

/** Lowest MIDI note of the given pitch class at or above `floor`. */
function midiAbove(pc: PitchClass | string, floor: number) {
  const chroma = TonalNote.chroma(typeof pc === 'string' ? pc : pitchClassName(pc))
  return floor + ((((chroma - floor) % 12) + 12) % 12)
}

const BASS_FLOOR = 40 // E2
const STRUM_FLOOR = 52 // E3

/** Chord tones for the strum, as a closed voicing above E3. */
export function strumNotes(c: Chord): number[] {
  const names = TonalChord.getChord(c.quality, pitchClassName(c.root)).notes
  return names.map((n) => midiAbove(n, STRUM_FLOOR)).sort((a, b) => a - b)
}

/** The fifth of a chord, or the root if it has none. */
function fifth(c: Chord): PitchClass | string {
  const names = TonalChord.getChord(c.quality, pitchClassName(c.root)).notes
  return names[2] ?? names[0] ?? c.root
}

/**
 * Boom-chuck backing: a bass note on the strong beats, alternating root and
 * fifth from bar to bar (4/4: root on 1, fifth on 3), and a short strum on the others.
 */
function backing(score: Score): PlaybackEvent[] {
  const out: PlaybackEvent[] = []
  const strongBeats = score.timeSignature.beats === 4 ? [0, 2] : [0]
  let barCount = 0
  for (const m of measureBounds(score)) {
    if (m.isPickup) continue
    for (let beat = 0; beat * TPQ < barTicks(score.timeSignature); beat++) {
      const tick = m.start + beat * TPQ
      const chord = score.chords.findLast((c) => c.start <= tick)
      if (!chord) continue
      const strong = strongBeats.indexOf(beat)
      if (strong !== -1) {
        // Slash chords keep their bass note on the "root" beats.
        const useFifth = (strong + barCount) % 2 === 1
        const pc = useFifth ? fifth(chord) : (chord.bass ?? chord.root)
        out.push({ part: 'bass', midi: midiAbove(pc, BASS_FLOOR), tick, durationTicks: TPQ, velocity: 80 })
      } else {
        strumNotes(chord).forEach((midi, strumIndex) =>
          out.push({ part: 'strum', midi, tick, durationTicks: TPQ / 2, velocity: 55, strumIndex }),
        )
      }
    }
    barCount++
  }
  return out
}

/** Everything to play from `from` on, sorted by time. */
export function scoreEvents(score: Score, from: Tick = 0, withBacking = true): PlaybackEvent[] {
  const end = scoreLength(score)
  const voices: PlaybackEvent[] = score.voices.flatMap((v) =>
    v.notes.map((n) => ({
      part: 'voice' as const,
      voiceId: v.id,
      noteId: n.id,
      midi: toMidi(n.pitch),
      tick: n.start,
      durationTicks: n.duration,
      velocity: 100,
    })),
  )
  return [...voices, ...(withBacking ? backing(score) : [])]
    .map((e) =>
      // A note already sounding at `from` is played from there on.
      e.tick < from && e.tick + e.durationTicks > from && e.part === 'voice'
        ? { ...e, tick: from, durationTicks: e.tick + e.durationTicks - from }
        : e,
    )
    .filter((e) => e.tick >= from && e.tick < end)
    .sort((a, b) => a.tick - b.tick)
}
