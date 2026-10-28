import { Key } from 'tonal'
import type { Alter, KeySignature, Pitch, PitchClass, Step } from './types'

export const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const STEP_SEMITONES: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export const toMidi = (p: Pitch): number =>
  (p.octave + 1) * 12 + STEP_SEMITONES[p.step] + p.alter

/** Position on the staff, counted in lines and spaces: C4 = 28. */
export const diatonicIndex = (p: Pick<Pitch, 'step' | 'octave'>): number =>
  p.octave * 7 + STEPS.indexOf(p.step)

export function fromDiatonicIndex(index: number, alter: Alter): Pitch {
  const octave = Math.floor(index / 7)
  return { step: STEPS[index - octave * 7], alter, octave }
}

const ACCIDENTALS: Record<Alter, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' }
const ALTER_BY_ACC: Record<string, Alter> = { bb: -2, b: -1, '': 0, '#': 1, '##': 2 }

export const pitchClassName = (pc: PitchClass): string => pc.step + ACCIDENTALS[pc.alter]
export const pitchName = (p: Pitch): string => pitchClassName(p) + p.octave

export function parsePitchClass(name: string): PitchClass {
  const m = /^([A-G])(bb|b|##|#)?$/.exec(name)
  if (!m) throw new Error(`Invalid pitch class: ${name}`)
  return { step: m[1] as Step, alter: ALTER_BY_ACC[m[2] ?? ''] }
}

export function parsePitch(name: string): Pitch {
  const m = /^([A-G](?:bb|b|##|#)?)(-?\d)$/.exec(name)
  if (!m) throw new Error(`Invalid pitch: ${name}`)
  return { ...parsePitchClass(m[1]), octave: Number(m[2]) }
}

export const keyName = (key: KeySignature): string =>
  pitchClassName(key.tonic) + (key.mode === 'minor' ? 'm' : '')

export function keyScale(key: KeySignature): PitchClass[] {
  const tonic = pitchClassName(key.tonic)
  const scale = key.mode === 'major' ? Key.majorKey(tonic).scale : Key.minorKey(tonic).natural.scale
  return scale.map(parsePitchClass)
}

/** The alteration the key signature applies to each step. */
export function keyAlterations(key: KeySignature): Record<Step, Alter> {
  const out = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 } as Record<Step, Alter>
  for (const pc of keyScale(key)) out[pc.step] = pc.alter
  return out
}
