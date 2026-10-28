import { Chord as TonalChord } from 'tonal'
import { parsePitchClass, pitchClassName } from './pitch'
import type { Chord } from './types'

export type ChordSpec = Omit<Chord, 'id' | 'start'>

/** Parses symbols like "G", "Em", "D7", "C/G". Returns null for unknown chords. */
export function parseChordSymbol(symbol: string): ChordSpec | null {
  const [main, bass] = symbol.trim().split('/')
  const [tonic, type] = TonalChord.tokenize(main)
  if (!tonic) return null
  const quality = type ?? ''
  if (TonalChord.get(tonic + quality).empty) return null
  try {
    return {
      root: parsePitchClass(tonic),
      quality,
      ...(bass ? { bass: parsePitchClass(bass) } : {}),
    }
  } catch {
    return null
  }
}

const pretty = (s: string) => s.replace(/#/g, '♯').replace(/b/g, '♭')

export function chordLabel(c: ChordSpec): string {
  const bass = c.bass ? '/' + pretty(pitchClassName(c.bass)) : ''
  return pretty(pitchClassName(c.root)) + c.quality.replace(/b(?=\d)/g, '♭') + bass
}
