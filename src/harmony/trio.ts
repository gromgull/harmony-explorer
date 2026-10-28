import { Chord as TonalChord, Note as TonalNote } from 'tonal'
import { keyScale, parsePitchClass, pitchClassName, STEPS, toMidi } from '@/model/pitch'
import type { Chord, Note, Pitch, PitchClass, Score, Tick, VoiceRole } from '@/model/types'

export type HarmonyRole = Exclude<VoiceRole, 'lead'>
export type HarmonyOptions = { highBaritone?: boolean }

const chroma = (pc: PitchClass) => TonalNote.chroma(pitchClassName(pc))

/** The nearest spelling of `pc` strictly above (direction 1) or below (-1) `ref`. */
function place(pc: PitchClass, ref: Pitch, direction: 1 | -1): Pitch {
  const refMidi = toMidi(ref)
  const candidates = [-1, 0, 1, 2].map((o) => ({ ...pc, octave: ref.octave + o * direction }))
  return candidates
    .filter((p) => (toMidi(p) - refMidi) * direction > 0)
    .sort((a, b) => (toMidi(a) - toMidi(b)) * direction)[0]
}

const chordTones = (c: Pick<Chord, 'root' | 'quality'>): PitchClass[] =>
  TonalChord.getChord(c.quality, pitchClassName(c.root)).notes.map(parsePitchClass)

/** The diatonic triad built on the lead's step, for melody notes outside the chord. */
function passingTriad(lead: Pitch, score: Score): PitchClass[] {
  const scale = keyScale(score.key)
  const i = STEPS.indexOf(lead.step)
  const degree = (n: number) => scale.find((pc) => pc.step === STEPS[(i + n) % 7])!
  return [{ step: lead.step, alter: lead.alter }, degree(2), degree(4)]
}

/**
 * The two pitch classes that tenor and baritone sing under a lead note.
 * They complete the chord without doubling the lead. With four or more tones
 * the 3rd and 7th come first, so the 5th is the one left out.
 */
export function harmonyTones(lead: Pitch, chord: Chord | null, score: Score): PitchClass[] {
  const leadChroma = chroma(lead)
  const tones = chord ? chordTones(chord) : []
  const inChord = tones.some((t) => chroma(t) === leadChroma)
  const source = inChord ? tones : passingTriad(lead, score)
  // Priority: 3rd, 7th, root, 5th, then extensions.
  const order = [1, 3, 0, 2, 4, 5, 6]
  return order
    .map((i) => source[i])
    .filter((t) => t && chroma(t) !== leadChroma)
    .filter((t, i, all) => all.findIndex((u) => chroma(u) === chroma(t)) === i)
    .slice(0, 2)
}

/** Tenor: nearest harmony tone above the lead. Baritone: the other one, below. */
export function trioNotes(lead: Pitch, chord: Chord | null, score: Score, options: HarmonyOptions = {}) {
  const tones = harmonyTones(lead, chord, score)
  if (tones.length === 0) return null
  const above = tones.map((t) => place(t, lead, 1))
  const tenorIndex = toMidi(above[0]) <= toMidi(above[1] ?? above[0]) ? 0 : 1
  const tenor = above[tenorIndex]
  const baritoneLow = place(tones[1 - tenorIndex] ?? tones[0], lead, -1)
  const baritone = options.highBaritone ? { ...baritoneLow, octave: baritoneLow.octave + 1 } : baritoneLow
  return { tenor, baritone }
}

const BASS_LOW = 40 // E2
const BASS_HIGH = 57 // A3

/** Bass on the chord root (or slash bass), in the octave closest to the previous bass note. */
function bassNote(chord: Chord, previous: Pitch | null): Pitch {
  const pc = chord.bass ?? chord.root
  const target = previous ? toMidi(previous) : 45 // around A2 to begin with
  let best: Pitch | null = null
  for (let octave = 1; octave <= 4; octave++) {
    const p = { ...pc, octave }
    const m = toMidi(p)
    if (m < BASS_LOW || m > BASS_HIGH) continue
    if (!best || Math.abs(m - target) < Math.abs(toMidi(best) - target)) best = p
  }
  return best!
}

type Segment = { start: Tick; end: Tick; lead: Pitch; chord: Chord | null; leadNoteId: string }

/** Lead notes, split where a chord changes under a held note. */
function segments(score: Score, leadNotes: Note[]): Segment[] {
  const chordAt = (t: Tick) => score.chords.findLast((c) => c.start <= t) ?? null
  return leadNotes.flatMap((n) => {
    const end = n.start + n.duration
    const cuts = [n.start, ...score.chords.map((c) => c.start).filter((t) => t > n.start && t < end), end]
    return cuts.slice(0, -1).map((start, i) => ({ start, end: cuts[i + 1], lead: n.pitch, chord: chordAt(start), leadNoteId: n.id }))
  })
}

const samePitch = (a: Pitch, b: Pitch) => a.step === b.step && a.alter === b.alter && a.octave === b.octave

/** Generates a harmony part that follows the lead's rhythm. Silent where there is no chord. */
export function harmonize(score: Score, role: HarmonyRole, options: HarmonyOptions = {}): Note[] {
  const lead = score.voices.find((v) => v.role === 'lead')
  if (!lead) return []
  const out: (Note & { leadNoteId: string })[] = []
  let previousBass: Pitch | null = null

  for (const seg of segments(score, lead.notes)) {
    if (!seg.chord) continue
    let pitch: Pitch | null
    if (role === 'bass') {
      pitch = bassNote(seg.chord, previousBass)
      previousBass = pitch
    } else {
      pitch = trioNotes(seg.lead, seg.chord, score, options)?.[role] ?? null
    }
    if (!pitch) continue
    const last = out.at(-1)
    // Within one lead note, keep holding rather than re-singing the same pitch.
    if (last && last.leadNoteId === seg.leadNoteId && last.start + last.duration === seg.start && samePitch(last.pitch, pitch)) {
      last.duration += seg.end - seg.start
    } else {
      out.push({ id: `${role}-${seg.start}`, start: seg.start, duration: seg.end - seg.start, pitch, leadNoteId: seg.leadNoteId })
    }
  }
  return out.map((n) => ({ id: n.id, start: n.start, duration: n.duration, pitch: n.pitch }))
}
