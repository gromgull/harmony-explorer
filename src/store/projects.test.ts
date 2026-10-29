import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyScore, EXAMPLES } from '@/model/sample'

const EXAMPLE_TITLES = EXAMPLES.map((e) => e.title)

vi.mock('@/playback/player', () => ({ stop: () => {} }))

const fakeStorage = () => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

// Fresh module state per test.
async function load(storage = fakeStorage()) {
  vi.resetModules()
  const projects = await import('./projects')
  const { useScoreStore } = await import('./score')
  projects.setStorageBackend(storage)
  return { ...projects, useScoreStore, storage }
}

describe('projects', () => {
  beforeEach(() => vi.useFakeTimers())

  it('seeds the examples and opens Amazing Grace first', async () => {
    const p = await load()
    p.bootstrap()
    expect(p.useProjectsStore.getState().projects.map((x) => x.title)).toEqual(EXAMPLE_TITLES)
    expect(p.useScoreStore.getState().score.title).toBe('Amazing Grace')
  })

  it('autosaves edits and reopens the last song after a reload', async () => {
    const p = await load()
    p.bootstrap()
    p.createProject(emptyScore())
    p.useScoreStore.getState().dispatch({ type: 'setTitle', title: 'My song' })
    vi.advanceTimersByTime(1000)

    const reloaded = await load(p.storage)
    reloaded.bootstrap()
    expect(reloaded.useScoreStore.getState().score.title).toBe('My song')
    expect(reloaded.useProjectsStore.getState().projects.map((x) => x.title)).toEqual([
      'My song',
      ...EXAMPLE_TITLES,
    ])
  })

  it('switching songs clears undo history and keeps both songs', async () => {
    const p = await load()
    p.bootstrap()
    p.useScoreStore.getState().dispatch({ type: 'setTempo', tempo: 120 })
    const other = p.useProjectsStore.getState().projects[1].id
    p.openProject(other)
    expect(p.useScoreStore.getState().score.title).toBe('Keep on the Sunny Side')
    expect(p.useScoreStore.temporal.getState().pastStates).toEqual([])
    p.openProject(p.useProjectsStore.getState().projects.find((x) => x.title === 'Amazing Grace')!.id)
    expect(p.useScoreStore.getState().score.tempo).toBe(120) // flushed before switching
  })

  it('deleting the open song opens another one', async () => {
    const p = await load()
    p.bootstrap()
    p.deleteProject(p.useProjectsStore.getState().currentId!)
    expect(p.useScoreStore.getState().score.title).toBe('Keep on the Sunny Side')
    expect(p.useProjectsStore.getState().projects).toHaveLength(EXAMPLES.length - 1)
  })
})
