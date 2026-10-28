import { describe, expect, it } from 'vitest'
import { beginTransaction, commitTransaction, useScoreStore } from './score'

describe('transactions', () => {
  it('make one undo step out of many edits', () => {
    const { dispatch } = useScoreStore.getState()
    const before = useScoreStore.temporal.getState().pastStates.length
    beginTransaction()
    for (const tempo of [100, 110, 120]) dispatch({ type: 'setTempo', tempo })
    commitTransaction()
    expect(useScoreStore.temporal.getState().pastStates.length).toBe(before + 1)
    useScoreStore.temporal.getState().undo()
    expect(useScoreStore.getState().score.tempo).toBe(90)
  })
})
