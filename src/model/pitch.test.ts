import { describe, expect, it } from 'vitest'
import { diatonicIndex, fromDiatonicIndex, keyAlterations, parsePitch, toMidi } from './pitch'

describe('pitch', () => {
  it('converts to midi', () => {
    expect(toMidi(parsePitch('C4'))).toBe(60)
    expect(toMidi(parsePitch('F#4'))).toBe(66)
    expect(toMidi(parsePitch('Cb4'))).toBe(59)
  })

  it('round-trips diatonic indices', () => {
    const p = parsePitch('Bb3')
    expect(fromDiatonicIndex(diatonicIndex(p), -1)).toEqual(p)
    expect(diatonicIndex(parsePitch('D4')) - diatonicIndex(parsePitch('C4'))).toBe(1)
  })

  it('knows key signatures', () => {
    expect(keyAlterations({ tonic: { step: 'D', alter: 0 }, mode: 'major' })).toMatchObject({ F: 1, C: 1, G: 0 })
    expect(keyAlterations({ tonic: { step: 'G', alter: 0 }, mode: 'minor' })).toMatchObject({ B: -1, E: -1, F: 0 })
  })
})
