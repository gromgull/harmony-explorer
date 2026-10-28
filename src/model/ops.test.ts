import { describe, expect, it } from 'vitest'
import { applyOp } from './ops'
import { parsePitch } from './pitch'
import { amazingGrace, keepOnTheSunnySide } from './sample'
import { barTicks, measureBounds, scoreLength } from './time'
import { TPQ, type Score } from './types'

const empty = (): Score => ({
  version: 1,
  title: '',
  timeSignature: { beats: 4, beatUnit: 4 },
  key: { tonic: { step: 'C', alter: 0 }, mode: 'major' },
  tempo: 100,
  pickup: 0,
  measureCount: 2,
  chords: [],
  voices: [{ id: 'v', role: 'lead', name: 'Lead', clef: 'treble', notes: [], source: { kind: 'manual' } }],
})

const insert = (s: Score, start: number, duration: number, pitch = 'C4', id?: string) =>
  applyOp(s, { type: 'insertNote', voiceId: 'v', start, duration, pitch: parsePitch(pitch), id })

const spans = (s: Score) => s.voices[0].notes.map((n) => [n.start, n.duration])

describe('insertNote', () => {
  it('keeps notes sorted', () => {
    const s = insert(insert(empty(), TPQ, TPQ), 0, TPQ)
    expect(spans(s)).toEqual([[0, TPQ], [TPQ, TPQ]])
  })

  it('overwrites notes starting inside the new note and shortens the one before', () => {
    let s = insert(empty(), 0, TPQ * 2, 'C4', 'a')
    s = insert(s, TPQ * 2, TPQ, 'D4', 'b')
    s = insert(s, TPQ, TPQ * 2, 'E4', 'c')
    expect(s.voices[0].notes.map((n) => [n.id, n.start, n.duration])).toEqual([
      ['a', 0, TPQ],
      ['c', TPQ, TPQ * 2],
    ])
  })

  it('snaps to the eighth grid and clamps at the end of the score', () => {
    const s = insert(empty(), TPQ * 7 + 10, TPQ * 4)
    expect(spans(s)).toEqual([[TPQ * 7, TPQ]])
  })
})

describe('setPickup', () => {
  it('shifts content so bar 1 keeps its music', () => {
    let s = insert(empty(), 0, TPQ)
    s = applyOp(s, { type: 'setPickup', pickup: TPQ })
    expect(spans(s)).toEqual([[TPQ, TPQ]])
    expect(measureBounds(s).map((m) => [m.number, m.start, m.end])).toEqual([
      [0, 0, TPQ],
      [1, TPQ, TPQ * 5],
      [2, TPQ * 5, TPQ * 9],
    ])
  })
})

describe('setTimeSignature', () => {
  it('adds bars rather than dropping notes', () => {
    let s = insert(empty(), TPQ * 7, TPQ)
    s = applyOp(s, { type: 'setTimeSignature', timeSignature: { beats: 3, beatUnit: 4 } })
    expect(s.measureCount).toBe(3)
    expect(spans(s)).toEqual([[TPQ * 7, TPQ]])
  })
})

describe('setChord', () => {
  it('replaces and removes chords on the quarter grid', () => {
    const G = { root: { step: 'G', alter: 0 }, quality: '' } as const
    let s = applyOp(empty(), { type: 'setChord', start: TPQ + 100, chord: G })
    expect(s.chords.map((c) => c.start)).toEqual([TPQ])
    s = applyOp(s, { type: 'setChord', start: TPQ, chord: null })
    expect(s.chords).toEqual([])
  })
})

describe('samples', () => {
  it.each([amazingGrace, keepOnTheSunnySide])('%o fills its last bar', (make) => {
    const s = make()
    const last = s.voices[0].notes.at(-1)!
    const end = last.start + last.duration
    expect(end).toBeLessThanOrEqual(scoreLength(s))
    expect(end).toBeGreaterThan(scoreLength(s) - barTicks(s.timeSignature))
  })

  it('places every note of Keep on the Sunny Side in its bar', () => {
    // 2-beat pickup, then 30 bars; the chorus starts on the downbeat of bar 16.
    const s = keepOnTheSunnySide()
    const keep = s.voices[0].notes.find((n) => n.lyric === 'Keep')!
    expect(keep.start).toBe(s.pickup + 15 * barTicks(s.timeSignature))
  })
})

describe('setChord with an off-beat pickup', () => {
  it('snaps to beats counted from bar 1', () => {
    const G = { root: { step: 'G', alter: 0 }, quality: '' } as const
    let s = applyOp(empty(), { type: 'setPickup', pickup: TPQ / 2 })
    s = applyOp(s, { type: 'setChord', start: TPQ / 2 + 10, chord: G })
    s = applyOp(s, { type: 'setChord', start: TPQ * 2 + 100, chord: G })
    expect(s.chords.map((c) => c.start)).toEqual([TPQ / 2, TPQ * 2.5])
  })
})

describe('harmony voices', () => {
  it('are added in staff order and frozen by hand edits', () => {
    let s = applyOp(empty(), { type: 'addHarmony', role: 'bass' })
    s = applyOp(s, { type: 'addHarmony', role: 'tenor' })
    s = applyOp(s, { type: 'addHarmony', role: 'baritone' })
    expect(s.voices.map((v) => v.role)).toEqual(['tenor', 'lead', 'baritone', 'bass'])
    expect(s.voices.find((v) => v.role === 'bass')?.clef).toBe('bass')

    s = applyOp(s, { type: 'insertNote', voiceId: 'tenor', start: 0, duration: TPQ, pitch: parsePitch('E4') })
    expect(s.voices[0].source).toMatchObject({ kind: 'generated', edited: true })
    s = applyOp(s, { type: 'regenerate', voiceId: 'tenor' })
    expect(s.voices[0].source).toEqual({ kind: 'generated', algorithm: 'trio', highBaritone: undefined })
  })

  it('put a high baritone above the tenor', () => {
    let s = applyOp(empty(), { type: 'addHarmony', role: 'tenor' })
    s = applyOp(s, { type: 'addHarmony', role: 'baritone' })
    s = applyOp(s, { type: 'regenerate', voiceId: 'baritone', highBaritone: true })
    expect(s.voices.map((v) => v.role)).toEqual(['baritone', 'tenor', 'lead'])
  })
})
