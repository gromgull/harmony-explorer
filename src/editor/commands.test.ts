import { beforeEach, describe, expect, it } from 'vitest'
import { amazingGrace } from '@/model/sample'
import { useScoreStore } from '@/store/score'
import { pasteLyrics, setLyric } from './commands'

const lyrics = () => useScoreStore.getState().score.voices[0].notes.slice(0, 6).map((n) => n.lyric ?? '')

describe('lyrics', () => {
  beforeEach(() => useScoreStore.setState({ score: amazingGrace() }))

  it('pastes syllables over consecutive notes, "_" skipping one', () => {
    const [first] = useScoreStore.getState().score.voices[0].notes
    const undoBefore = useScoreStore.temporal.getState().pastStates.length
    pasteLyrics(first.id, 'Oh  hap-py _ day\nhey')
    expect(lyrics()).toEqual(['Oh', 'hap-', 'py', '', 'day', 'hey'])
    expect(useScoreStore.temporal.getState().pastStates.length).toBe(undoBefore + 1)
  })

  it('removes a lyric when the text is empty', () => {
    const [first] = useScoreStore.getState().score.voices[0].notes
    setLyric(first.id, '', true)
    expect(lyrics()[0]).toBe('')
  })
})
