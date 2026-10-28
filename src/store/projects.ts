import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { syncHarmonies } from '@/harmony/sync'
import { amazingGrace, EXAMPLES } from '@/model/sample'
import type { Score } from '@/model/types'
import { stop } from '@/playback/player'
import { useEditorStore } from './editor'
import { useScoreStore } from './score'

export type ProjectMeta = { id: string; title: string; updatedAt: number }

const INDEX_KEY = 'harmony.projects'
const CURRENT_KEY = 'harmony.current'
const projectKey = (id: string) => `harmony.project.${id}`
const SAVE_DELAY = 400

// ---- storage (localStorage, or memory when it is unavailable) ----

type Backend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function memoryBackend(): Backend {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

function defaultBackend(): Backend {
  try {
    const ls = window.localStorage
    ls.setItem('harmony.probe', '1')
    ls.removeItem('harmony.probe')
    return ls
  } catch {
    return memoryBackend() // private mode, blocked storage, tests
  }
}

let backend: Backend | null = null
const storage = () => (backend ??= defaultBackend())

/** For tests: swap the storage backend. */
export const setStorageBackend = (b: Backend) => (backend = b)

function read<T>(key: string): T | null {
  try {
    const raw = storage().getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Could not save', key, e) // e.g. quota exceeded
  }
}

function loadScore(id: string): Score | null {
  const score = read<Score>(projectKey(id))
  return score && score.version === 1 && Array.isArray(score.voices) ? score : null
}

// ---- store ----

type ProjectsStore = { projects: ProjectMeta[]; currentId: string | null }

export const useProjectsStore = create<ProjectsStore>()(() => ({ projects: [], currentId: null }))

const state = () => useProjectsStore.getState()

function setProjects(projects: ProjectMeta[]) {
  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
  useProjectsStore.setState({ projects: sorted })
  write(INDEX_KEY, sorted)
}

let loading = false // true while a stored score is put into the score store
let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Writes pending changes of the open score now, instead of after the debounce. */
export function flushSave() {
  if (!saveTimer) return
  clearTimeout(saveTimer)
  saveTimer = null
  const { currentId } = state()
  if (!currentId) return
  const score = useScoreStore.getState().score
  write(projectKey(currentId), score)
  setProjects(state().projects.map((p) => (p.id === currentId ? { ...p, title: score.title, updatedAt: Date.now() } : p)))
}

function show(id: string, score: Score) {
  stop()
  loading = true
  useScoreStore.setState({ score: syncHarmonies(score) })
  useScoreStore.temporal.getState().clear() // undo history is per song
  loading = false
  useEditorStore.setState({ selection: [], chordEdit: null, lyricEdit: null })
  useProjectsStore.setState({ currentId: id })
  write(CURRENT_KEY, id)
}

export function openProject(id: string) {
  if (id === state().currentId) return
  const score = loadScore(id)
  if (!score) return
  flushSave()
  show(id, score)
}

function addProject(score: Score, updatedAt = Date.now()): string {
  const id = nanoid()
  write(projectKey(id), score)
  setProjects([...state().projects, { id, title: score.title, updatedAt }])
  return id
}

export function createProject(score: Score): string {
  flushSave()
  const id = addProject(score)
  show(id, score)
  return id
}

export function duplicateProject() {
  const score = useScoreStore.getState().score
  createProject({ ...score, title: `${score.title} (copy)` })
}

export function deleteProject(id: string) {
  if (saveTimer && id === state().currentId) clearTimeout(saveTimer)
  saveTimer = null
  storage().removeItem(projectKey(id))
  const rest = state().projects.filter((p) => p.id !== id)
  setProjects(rest)
  if (id !== state().currentId) return
  useProjectsStore.setState({ currentId: null })
  const next = rest.find((p) => loadScore(p.id))
  if (next) show(next.id, loadScore(next.id)!)
  else createProject(EXAMPLES[0].make())
}

/** Loads the song list and opens the last song; seeds the examples on first visit. */
export function bootstrap() {
  const projects = (read<ProjectMeta[]>(INDEX_KEY) ?? []).filter((p) => loadScore(p.id))
  useProjectsStore.setState({ projects })
  if (projects.length === 0) {
    const now = Date.now()
    const ids = EXAMPLES.map((example, i) => addProject(example.make(), now - i)) // listed in this order
    show(ids[0], loadScore(ids[0])!)
    return
  }
  const current = read<string>(CURRENT_KEY)
  const id = projects.some((p) => p.id === current) ? current! : projects[0].id
  show(id, loadScore(id) ?? amazingGrace())
}

// Autosave: every change to the score is written shortly after.
useScoreStore.subscribe((s, prev) => {
  if (loading || s.score === prev.score || !state().currentId) return
  if (s.score.title !== prev.score.title) {
    const id = state().currentId
    useProjectsStore.setState({ projects: state().projects.map((p) => (p.id === id ? { ...p, title: s.score.title } : p)) })
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, SAVE_DELAY)
})

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave()
  })
}
