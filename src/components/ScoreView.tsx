import { useEffect, useRef, useState } from 'react'
import { ChordInput } from '@/components/ChordInput'
import { LyricInput } from '@/components/LyricInput'
import { PlaybackCursor } from '@/components/PlaybackCursor'
import * as cmd from '@/editor/commands'
import { locate, lyricAnchor, noteAt, yForIndex, type Target } from '@/editor/hittest'
import { fontsReady } from '@/engrave/fonts'
import { interpolateX, topLineIndex } from '@/engrave/geometry'
import { renderScore, SELECTED, type HitMap } from '@/engrave/render'
import { diatonicIndex, fromDiatonicIndex, keyAlterations } from '@/model/pitch'
import type { NoteId, Pitch, Score } from '@/model/types'
import { useEditorStore } from '@/store/editor'
import { beginTransaction, commitTransaction } from '@/store/score'

type Drag = { noteId: NoteId; startY: number; origin: Pitch; spacing: number }

export function ScoreView({ score }: { score: Score }) {
  const wrapper = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [width, setWidth] = useState(0)
  const [ready, setReady] = useState(false)
  const [hit, setHit] = useState<HitMap | null>(null)
  const [hover, setHover] = useState<Target | null>(null)
  const [overNote, setOverNote] = useState(false)
  const [dragging, setDragging] = useState(false)
  const selection = useEditorStore((s) => s.selection)
  const chordEdit = useEditorStore((s) => s.chordEdit)
  const lyricEdit = useEditorStore((s) => s.lyricEdit)

  useEffect(() => {
    fontsReady.then(() => setReady(true))
  }, [])

  useEffect(() => {
    const el = wrapper.current!
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!ready || width === 0) return
    const result = renderScore(canvas.current!, score, width, new Set(selection), lyricEdit?.noteId)
    if (import.meta.env.DEV) Object.assign(window, { hitMap: result }) // for debugging and browser tests
    setHit(result)
  }, [score, width, ready, selection, lyricEdit?.noteId])

  const point = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDrag = (e: React.PointerEvent, noteId: NoteId, origin: Pitch, spacing: number) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    beginTransaction()
    drag.current = { noteId, startY: point(e).y, origin, spacing }
    setDragging(true)
    setHover(null)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hit || e.button !== 0) return
    const { x, y } = point(e)
    const spacing = hit.systems[0]?.staves[0]?.spacing ?? 10
    const noteId = noteAt(hit, x, y)
    if (noteId) {
      cmd.select([noteId])
      const note = score.voices.flatMap((v) => v.notes).find((n) => n.id === noteId)!
      startDrag(e, noteId, note.pitch, spacing)
      return
    }
    const target = locate(hit, score, x, y)
    if (!target) return
    if (target.region === 'chord') {
      cmd.openChordEdit(target.tick)
      return
    }
    if (target.region === 'lyric') {
      cmd.openLyricEdit(target.noteId)
      return
    }
    // Insert and keep dragging to adjust the pitch, all in one undo step.
    startDrag(e, '', target.pitch, target.staff.spacing)
    drag.current!.noteId = cmd.insertNote(target.voiceId, target.tick, target.pitch)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!hit) return
    const { x, y } = point(e)
    const d = drag.current
    if (d) {
      const steps = Math.round((d.startY - y) / (d.spacing / 2))
      const index = diatonicIndex(d.origin) + steps
      const step = fromDiatonicIndex(index, 0).step
      const pitch = steps === 0 ? d.origin : fromDiatonicIndex(index, keyAlterations(score.key)[step])
      cmd.movePitch(d.noteId, pitch)
      return
    }
    const over = noteAt(hit, x, y) !== null
    setOverNote(over)
    setHover(over ? null : locate(hit, score, x, y))
  }

  const endDrag = () => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    commitTransaction()
  }

  const lead = score.voices.find((v) => v.role === 'lead')
  const lyricPos = lyricEdit && hit && lead ? lyricAnchor(hit, lyricEdit.noteId, lead.id) : null

  const chordPos = (() => {
    if (!chordEdit || !hit) return null
    for (const s of hit.systems) {
      const m = s.measures.find((m) => chordEdit.tick >= m.start && chordEdit.tick < m.end)
      if (m) return { x: interpolateX(m.ticks, chordEdit.tick), y: s.chordY }
    }
    return null
  })()

  return (
    <div ref={wrapper} className="relative w-full select-none">
      <div ref={canvas} className="score" />
      {hit && (
        <svg
          className="absolute inset-0"
          width={hit.width}
          height={hit.height}
          style={{
            cursor: overNote || dragging ? 'ns-resize' : hover?.region === 'lyric' ? 'text' : 'default',
            touchAction: 'none',
          }}
          onPointerDown={onPointerDown}
          // Keep focus where it is, e.g. in a chord input that this click opens.
          onMouseDown={(e) => e.preventDefault()}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => setHover(null)}
        >
          {hover && !dragging && <Ghost target={hover} />}
          <PlaybackCursor hit={hit} />
        </svg>
      )}
      {chordEdit && chordPos && <ChordInput key={chordEdit.tick} score={score} tick={chordEdit.tick} {...chordPos} />}
      {lyricEdit && lyricPos && <LyricInput key={lyricEdit.noteId} score={score} noteId={lyricEdit.noteId} caret={lyricEdit.caret} {...lyricPos} />}
    </div>
  )
}

function Ghost({ target }: { target: Target }) {
  if (target.region === 'lyric') {
    return <line x1={target.x - 14} x2={target.x + 14} y1={target.y + 4} y2={target.y + 4} stroke={SELECTED} strokeWidth={1.5} opacity={0.5} />
  }
  if (target.region === 'chord') {
    return (
      <g opacity={0.5}>
        <rect x={target.x - 3} y={target.y - 15} width={30} height={20} rx={3} fill="none" stroke={SELECTED} strokeDasharray="3 2" />
        <text x={target.x + 12} y={target.y} textAnchor="middle" fill={SELECTED} fontSize={14}>
          +
        </text>
      </g>
    )
  }
  const { staff, index, x, y } = target
  const top = topLineIndex(staff.clef)
  const bottom = top - 8
  const ledgers: number[] = []
  for (let i = top + 2; i <= index; i += 2) ledgers.push(i)
  for (let i = bottom - 2; i >= index; i -= 2) ledgers.push(i)
  return (
    <g opacity={0.45} pointerEvents="none">
      {ledgers.map((i) => (
        <line key={i} x1={x - 10} x2={x + 10} y1={yForIndex(staff, i)} y2={yForIndex(staff, i)} stroke={SELECTED} strokeWidth={1.2} />
      ))}
      <ellipse cx={x} cy={y} rx={6.2} ry={4.6} transform={`rotate(-20 ${x} ${y})`} fill={SELECTED} />
    </g>
  )
}
