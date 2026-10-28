import { describe, expect, it } from 'vitest'
import { syncHarmonies } from '@/harmony/sync'
import { applyOp } from './ops'
import { parsePitch } from './pitch'
import { keepOnTheSunnySide } from './sample'
import { decodeShareHash, encodeShareHash } from './share'
import type { Score } from './types'

// Ids are regenerated on import.
const withoutIds = (s: Score) => JSON.parse(JSON.stringify(s, (k, v) => (k === 'id' ? undefined : v)))

const roundTrip = async (s: Score) => syncHarmonies((await decodeShareHash(await encodeShareHash(s)))!)

describe('share links', () => {
  it('round-trips a song with harmonies, edited and generated', async () => {
    let s = keepOnTheSunnySide()
    s = applyOp(s, { type: 'addHarmony', role: 'tenor' })
    s = applyOp(s, { type: 'addHarmony', role: 'bass' })
    s = syncHarmonies(s)
    const bass = s.voices.find((v) => v.role === 'bass')!
    s = applyOp(s, { type: 'moveNote', noteId: bass.notes[0].id, pitch: parsePitch('C3') })
    expect(s.voices.find((v) => v.role === 'bass')!.source).toMatchObject({ edited: true })
    expect(withoutIds(await roundTrip(s))).toEqual(withoutIds(s))
  })

  it('stays short enough to paste', async () => {
    expect((await encodeShareHash(keepOnTheSunnySide())).length).toBeLessThan(1500)
  })

  it('rejects damaged links', async () => {
    expect(await decodeShareHash('#song/1/not-a-song')).toBeNull()
    expect(await decodeShareHash('#something-else')).toBeNull()
  })
})
