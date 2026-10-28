import { HEAD_OFFSET, interpolateX, topLineIndex } from '@/engrave/geometry'
import type { HitMap } from '@/engrave/render'
import { fromDiatonicIndex, keyAlterations } from '@/model/pitch'
import { firstBeatFrom } from '@/model/time'
import { EIGHTH, TPQ, type NoteId, type Pitch, type Score, type Tick } from '@/model/types'

const LEDGER_LIMIT = 8 // staff positions allowed beyond the outer lines (4 ledger lines)
const NOTE_RADIUS = 9

type System = HitMap['systems'][number]
type Staff = System['staves'][number]

export type StaffTarget = {
  region: 'staff'
  voiceId: string
  tick: Tick
  pitch: Pitch // spelled with the key signature
  index: number // diatonic index
  x: number // notehead centre of the snapped position
  y: number
  staff: Staff
}

export type ChordTarget = { region: 'chord'; tick: Tick; x: number; y: number }

export type LyricTarget = { region: 'lyric'; noteId: NoteId; x: number; y: number }

export type Target = StaffTarget | ChordTarget | LyricTarget

/** The y of a diatonic position on a staff. */
export const yForIndex = (staff: Staff, index: number) =>
  staff.topLineY + (topLineIndex(staff.clef) - index) * (staff.spacing / 2)

export const indexForY = (staff: Staff, y: number) =>
  topLineIndex(staff.clef) - Math.round((y - staff.topLineY) / (staff.spacing / 2))

function nearestSystem(hit: HitMap, y: number): System | undefined {
  return hit.systems.find((s) => y >= s.top && y < s.bottom) ??
    hit.systems.reduce<System | undefined>(
      (best, s) => (!best || Math.abs(y - (s.top + s.bottom) / 2) < Math.abs(y - (best.top + best.bottom) / 2) ? s : best),
      undefined,
    )
}

/** Snaps x to the nearest grid position (starting at `first`) within the measure under it. */
function snapTick(system: System, x: number, grid: Tick, first: (measureStart: Tick) => Tick = (t) => t) {
  const m = system.measures.find((m) => x >= m.x0 && x < m.x1) ?? (x < system.measures[0].x0 ? system.measures[0] : system.measures.at(-1)!)
  const start = first(m.start)
  let best = { tick: start, x: interpolateX(m.ticks, start) }
  for (let t = start; t < m.end; t += grid) {
    const tx = interpolateX(m.ticks, t)
    if (Math.abs(tx + HEAD_OFFSET - x) < Math.abs(best.x + HEAD_OFFSET - x)) best = { tick: t, x: tx }
  }
  return best
}

export function locate(hit: HitMap, score: Score, x: number, y: number): Target | null {
  const system = nearestSystem(hit, y)
  if (!system || system.measures.length === 0) return null

  if (y < system.chordY + 6) {
    const snapped = snapTick(system, x, TPQ, (t) => firstBeatFrom(score, t))
    return { region: 'chord', tick: snapped.tick, x: snapped.x, y: system.chordY }
  }

  const staff = system.staves.reduce((best, s) =>
    Math.abs(y - (s.topLineY + 2 * s.spacing)) < Math.abs(y - (best.topLineY + 2 * best.spacing)) ? s : best,
  )
  // Below the lead staff, the lyric line of the nearest note.
  const lead = score.voices.find((v) => v.role === 'lead')
  if (staff.voiceId === lead?.id && y > staff.topLineY + 4 * staff.spacing + staff.spacing * 1.5) {
    const ids = new Set(lead.notes.map((n) => n.id))
    let best: LyricTarget | null = null
    for (const [noteId, heads] of hit.notes) {
      const h = heads[0] // a lyric belongs to the first piece of a tied note
      if (!ids.has(noteId) || h.y < system.top || h.y > system.bottom) continue
      if (!best || Math.abs(h.x - x) < Math.abs(best.x - x)) best = { region: 'lyric', noteId, x: h.x, y: staff.lyricY }
    }
    if (best) return best
  }

  const top = topLineIndex(staff.clef)
  const index = Math.max(top - 8 - LEDGER_LIMIT, Math.min(top + LEDGER_LIMIT, indexForY(staff, y)))
  const snapped = snapTick(system, x, EIGHTH)
  const step = fromDiatonicIndex(index, 0).step
  return {
    region: 'staff',
    voiceId: staff.voiceId,
    tick: snapped.tick,
    pitch: fromDiatonicIndex(index, keyAlterations(score.key)[step]),
    index,
    x: snapped.x + HEAD_OFFSET,
    y: yForIndex(staff, index),
    staff,
  }
}

/** The note whose head (or a tied piece of it) is under the pointer. */
export function noteAt(hit: HitMap, x: number, y: number): NoteId | null {
  let best: { id: NoteId; d: number } | null = null
  for (const [id, heads] of hit.notes) {
    for (const h of heads) {
      const d = Math.hypot(h.x - x, (h.y - y) * 1.5)
      if (d < NOTE_RADIUS && (!best || d < best.d)) best = { id, d }
    }
  }
  return best?.id ?? null
}

/** Where the lyric of a note is written: its first notehead's x, on its staff's lyric line. */
export function lyricAnchor(hit: HitMap, noteId: NoteId, voiceId: string) {
  const head = hit.notes.get(noteId)?.[0]
  if (!head) return null
  const system = hit.systems.find((s) => head.y >= s.top && head.y <= s.bottom)
  const staff = system?.staves.find((s) => s.voiceId === voiceId)
  return staff ? { x: head.x, y: staff.lyricY } : null
}
