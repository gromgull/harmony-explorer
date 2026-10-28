import { describe, expect, it } from 'vitest'
import { applyOp } from '@/model/ops'
import { parsePitch } from '@/model/pitch'
import { amazingGrace } from '@/model/sample'
import { TPQ, type Score } from '@/model/types'
import { layoutScore, splitRestSpan } from './layout'

const base = (): Score => ({
  version: 1,
  title: '',
  timeSignature: { beats: 4, beatUnit: 4 },
  key: { tonic: { step: 'G', alter: 0 }, mode: 'major' },
  tempo: 100,
  pickup: 0,
  measureCount: 2,
  chords: [],
  voices: [{ id: 'v', role: 'lead', name: 'Lead', clef: 'treble', notes: [], source: { kind: 'manual' } }],
})

const codes = (s: Score, measure: number) =>
  layoutScore(s)[measure].voices[0].tickables.map((t) => (t.kind === 'rest' ? 'r' : '') + t.code + '.'.repeat(t.dots))

describe('rests', () => {
  it('uses a bar rest for an empty bar', () => {
    expect(codes(base(), 0)).toEqual(['rw'])
  })

  it('splits rests on beat boundaries', () => {
    expect(splitRestSpan(TPQ / 2, TPQ * 3.5, TPQ * 4, true).map((v) => v.code)).toEqual(['8', 'q', 'h'])
    expect(splitRestSpan(TPQ, TPQ * 2, TPQ * 3, true).map((v) => v.code)).toEqual(['q', 'q'])
  })
})

describe('notes', () => {
  it('ties notes across barlines', () => {
    const s = applyOp(base(), { type: 'insertNote', voiceId: 'v', start: TPQ * 3, duration: TPQ * 2, pitch: parsePitch('B4') })
    const [m1, m2] = layoutScore(s)
    expect(m1.voices[0].tickables.at(-1)).toMatchObject({ code: 'q', tieToNext: true })
    expect(m2.voices[0].tickables[0]).toMatchObject({ code: 'q', tieToNext: false })
  })

  it('prints accidentals against the key and once per bar', () => {
    let s = base()
    for (const [i, p] of ['F4', 'F4', 'F#4', 'F4'].entries()) {
      s = applyOp(s, { type: 'insertNote', voiceId: 'v', start: i * TPQ, duration: TPQ, pitch: parsePitch(p) })
    }
    expect(layoutScore(s)[0].voices[0].tickables.map((t) => t.accidental)).toEqual([0, undefined, 1, 0])
  })

  it('lays out the sample with a pickup bar and the held note tied', () => {
    const layout = layoutScore(amazingGrace())
    expect(layout[0]).toMatchObject({ isPickup: true, number: 0 })
    expect(layout[7].voices[0].tickables).toMatchObject([{ code: 'h', dots: 1, tieToNext: true, lyric: 'me' }])
    expect(layout[8].voices[0].tickables.map((t) => t.code)).toEqual(['h', 'q'])
  })
})
