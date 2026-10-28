import {
  Accidental,
  Beam,
  Dot,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice as VFVoice,
  type SVGContext,
} from 'vexflow/bravura'
import { chordLabel } from '@/model/chord'
import { keyName } from '@/model/pitch'
import { barTicks } from '@/model/time'
import { EIGHTH, TPQ, type Alter, type Clef, type NoteId, type Pitch, type Score, type Tick } from '@/model/types'
import { interpolateX } from './geometry'
import { layoutScore, type MeasureLayout, type Tickable } from './layout'

// ---- geometry ----
const MARGIN_X = 16
const STAFF_HEIGHT = 80 // stave incl. VexFlow's internal padding
const LYRIC_SPACE = 34 // below each staff
const SYSTEM_GAP = 28
const MEASURE_PAD_END = 14
const SPREAD = 1.5 // how much looser than the minimal width a measure is packed
export const SELECTED = '#2563eb'

/** Geometry kept for hit-testing and overlays (playback cursor, editing). */
export type HitMap = {
  width: number
  height: number
  systems: {
    top: number
    bottom: number
    chordY: number // baseline of the chord symbols
    staves: { voiceId: string; clef: Clef; topLineY: number; spacing: number }[]
    measures: { index: number; start: Tick; end: Tick; x0: number; x1: number; ticks: [Tick, number][] }[]
  }[]
  notes: Map<NoteId, { x: number; y: number }[]>
}

const VF_ACCIDENTAL: Record<Alter, string> = { [-2]: 'bb', [-1]: 'b', 0: 'n', 1: '#', 2: '##' }
const KEY_ACCIDENTAL: Record<Alter, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' }

function vfKey(p: Pitch, clef: Clef) {
  const octave = clef === 'treble8' ? p.octave + 1 : p.octave // written an octave higher
  return `${p.step.toLowerCase()}${KEY_ACCIDENTAL[p.alter]}/${octave}`
}

// Whole rests hang from the 4th line, so they need a higher key than other rests.
const restKey = (clef: Clef, whole: boolean) =>
  clef === 'bass' ? (whole ? 'f/3' : 'd/3') : whole ? 'd/5' : 'b/4'
const vfClef = (clef: Clef) => (clef === 'bass' ? 'bass' : 'treble')

function buildNotes(score: Score, m: MeasureLayout, voiceIndex: number) {
  const clef = score.voices[voiceIndex].clef
  const isBarRest = (t: Tickable) =>
    t.kind === 'rest' && t.duration === m.end - m.start && t.duration === barTicks(score.timeSignature)

  return m.voices[voiceIndex].tickables.map((t) => {
    const barRest = isBarRest(t)
    const note = new StaveNote({
      clef: vfClef(clef),
      keys: [t.kind === 'note' ? vfKey(t.pitch!, clef) : restKey(clef, barRest || t.code === 'w')],
      duration: (barRest ? 'w' : t.code) + (t.kind === 'rest' ? 'r' : ''),
      dots: barRest ? 0 : t.dots,
      alignCenter: barRest,
      ...(barRest ? { durationOverride: new Fraction(t.duration / EIGHTH, 8) } : {}),
    })
    if (t.dots && !barRest) Dot.buildAndAttach([note], { all: true })
    if (t.accidental !== undefined) note.addModifier(new Accidental(VF_ACCIDENTAL[t.accidental]), 0)
    return { t, note, barRest }
  })
}

function buildVoice(m: MeasureLayout, notes: StaveNote[]) {
  return new VFVoice({ numBeats: (m.end - m.start) / EIGHTH, beatValue: 8 })
    .setMode(VFVoice.Mode.SOFT)
    .addTickables(notes)
}

function minMeasureWidth(score: Score, m: MeasureLayout) {
  const voices = score.voices.map((_, i) => buildVoice(m, buildNotes(score, m, i).map((n) => n.note)))
  const f = new Formatter()
  f.joinVoices(voices)
  // Leave room to click notes into sparse or empty bars.
  const roomy = 40 * ((m.end - m.start) / TPQ)
  return Math.max(f.preCalculateMinTotalWidth(voices), roomy) + MEASURE_PAD_END + 20
}

function modifierWidth(score: Score, withTime: boolean) {
  const stave = new Stave(0, 0, 500).addClef('treble').addKeySignature(keyName(score.key))
  if (withTime) stave.addTimeSignature(`${score.timeSignature.beats}/4`)
  return stave.getNoteStartX()
}

/** Greedily packs measures into lines; returns the measure indices per line. */
function breakLines(score: Score, measures: MeasureLayout[], width: number) {
  const usable = width - 2 * MARGIN_X
  const mins = measures.map((m) => minMeasureWidth(score, m) * SPREAD)
  const lines: number[][] = []
  let line: number[] = []
  let used = 0
  measures.forEach((_, i) => {
    const head = line.length === 0 ? modifierWidth(score, lines.length === 0) : 0
    if (line.length > 0 && used + mins[i] > usable) {
      lines.push(line)
      line = []
      used = modifierWidth(score, false)
    } else {
      used += head
    }
    line.push(i)
    used += mins[i]
  })
  if (line.length) lines.push(line)
  return { lines, mins }
}

function svgText(parent: SVGElement, text: string, x: number, y: number, cls: string, anchor = 'middle') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  el.setAttribute('x', String(x))
  el.setAttribute('y', String(y))
  el.setAttribute('text-anchor', anchor)
  el.setAttribute('class', cls)
  el.textContent = text
  parent.appendChild(el)
}

export function renderScore(
  container: HTMLDivElement,
  score: Score,
  width: number,
  selection: ReadonlySet<NoteId> = new Set(),
): HitMap {
  container.innerHTML = ''
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  const ctx = renderer.getContext() as SVGContext
  renderer.resize(width, 100)

  const measures = layoutScore(score)
  const { lines, mins } = breakLines(score, measures, width)
  const voiceCount = score.voices.length

  const hit: HitMap = { width, height: 0, systems: [], notes: new Map() }
  const pendingTie = new Map<string, { note: StaveNote; line: number }>() // per voice
  const beamGroups = Beam.getDefaultBeamGroups(`${score.timeSignature.beats}/4`)
  let cursorY = 10

  // Each line is drawn at y = 0 inside its own group, then moved down below the
  // previous one, so a system is exactly as tall as its contents.
  lines.forEach((line, lineIndex) => {
    const group = ctx.openGroup('system')
    const isLast = lineIndex === lines.length - 1
    const usable = width - 2 * MARGIN_X - modifierWidth(score, lineIndex === 0)
    const natural = line.reduce((sum, i) => sum + mins[i], 0)
    // Stretch to the full width, except a short last line.
    const scale = isLast && natural < usable * 0.6 ? 1 : usable / natural

    const system: HitMap['systems'][number] = { top: 0, bottom: 0, chordY: 0, staves: [], measures: [] }
    const ties: StaveTie[] = []
    const beams: Beam[] = []
    const notes: { id: NoteId; x: number; y: number }[] = []
    // Chords and lyrics share one baseline per line, clear of the highest/lowest notes.
    const chords: { label: string; x: number }[] = []
    const lyrics: { text: string; x: number; vi: number }[] = []
    let chordY = Infinity
    const lyricY = score.voices.map(() => -Infinity)
    let x = MARGIN_X

    line.forEach((mi, posInLine) => {
      const m = measures[mi]
      const head = posInLine === 0 ? modifierWidth(score, lineIndex === 0) : 0
      const measureWidth = head + mins[mi] * scale

      const staves = score.voices.map((voice, vi) => {
        const stave = new Stave(x, vi * (STAFF_HEIGHT + LYRIC_SPACE), measureWidth)
        if (posInLine === 0) {
          stave.addClef(vfClef(voice.clef), 'default', voice.clef === 'treble8' ? '8vb' : undefined)
          stave.addKeySignature(keyName(score.key))
          if (lineIndex === 0) stave.addTimeSignature(`${score.timeSignature.beats}/4`)
        }
        if (mi === measures.length - 1) stave.setEndBarType(3) // final barline
        return stave
      })
      const noteStart = Math.max(...staves.map((s) => s.getNoteStartX()))
      staves.forEach((s) => s.setNoteStartX(noteStart))

      const built = score.voices.map((_, vi) => buildNotes(score, m, vi))
      for (const { t, note } of built.flat()) {
        if (t.noteId && selection.has(t.noteId)) note.setStyle({ fillStyle: SELECTED, strokeStyle: SELECTED })
      }
      const vfVoices = built.map((b) => buildVoice(m, b.map((n) => n.note)))
      built.forEach((b) => {
        const eighths = b.map((n) => n.note).filter((n) => n.getDuration() === '8' && !n.isRest())
        if (eighths.length > 1) beams.push(...Beam.generateBeams(b.map((n) => n.note), { groups: beamGroups }))
      })
      new Formatter().format(vfVoices, x + measureWidth - noteStart - MEASURE_PAD_END)

      staves.forEach((s) => s.setContext(ctx).draw())
      vfVoices.forEach((v, vi) => v.draw(ctx, staves[vi]))
      if (posInLine === 0 && voiceCount > 1) {
        new StaveConnector(staves[0], staves.at(-1)!).setType('bracket').setContext(ctx).draw()
      }
      if (voiceCount > 1) {
        new StaveConnector(staves[0], staves.at(-1)!).setType('singleRight').setContext(ctx).draw()
      }

      // ticks → x, across all voices
      const tickX = new Map<Tick, number>([[m.start, noteStart]])
      built.forEach((b, vi) =>
        b.forEach(({ t, note, barRest }) => {
          if (!barRest) tickX.set(t.start, Math.min(tickX.get(t.start) ?? Infinity, note.getAbsoluteX()))
          if (note.isRest()) return
          const voiceId = score.voices[vi].id
          const headX = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2
          notes.push({ id: t.noteId!, x: headX, y: note.getYs()[0] })

          const pending = pendingTie.get(voiceId)
          if (pending) {
            ties.push(
              pending.line === lineIndex
                ? new StaveTie({ firstNote: pending.note, lastNote: note, firstIndexes: [0], lastIndexes: [0] })
                : new StaveTie({ lastNote: note, lastIndexes: [0] }), // continues from the previous line
            )
            pendingTie.delete(voiceId)
          }
          if (t.tieToNext) pendingTie.set(voiceId, { note, line: lineIndex })

          const box = note.getBoundingBox()
          if (vi === 0) chordY = Math.min(chordY, box.getY() - 10)
          lyricY[vi] = Math.max(lyricY[vi], box.getY() + box.getH() + 16)
          if (t.lyric) lyrics.push({ text: t.lyric, x: headX, vi })
        }),
      )
      tickX.set(m.end, x + measureWidth)
      const ticks = [...tickX.entries()].sort((a, b) => a[0] - b[0])

      chordY = Math.min(chordY, staves[0].getYForLine(0) - 18)
      staves.forEach((s, vi) => (lyricY[vi] = Math.max(lyricY[vi], s.getYForLine(4) + 28)))
      for (const c of score.chords) {
        if (c.start >= m.start && c.start < m.end) chords.push({ label: chordLabel(c), x: interpolateX(ticks, c.start) })
      }

      system.measures.push({ index: m.index, start: m.start, end: m.end, x0: x, x1: x + measureWidth, ticks })
      if (posInLine === 0) {
        system.staves = staves.map((s, vi) => ({
          voiceId: score.voices[vi].id,
          clef: score.voices[vi].clef,
          topLineY: s.getYForLine(0),
          spacing: s.getSpacingBetweenLines(),
        }))
      }
      x += measureWidth
    })

    // A tie still open at the end of the line is drawn to the barline.
    for (const { note } of pendingTie.values()) ties.push(new StaveTie({ firstNote: note, firstIndexes: [0] }))

    beams.forEach((b) => b.setContext(ctx).draw())
    ties.forEach((t) => t.setContext(ctx).draw())
    chords.forEach((c) => svgText(group, c.label, c.x, chordY, 'chord', 'start'))
    // lyrics, with hyphens centred between syllables of the same word
    lyrics.forEach((l, i) => {
      const continues = l.text.endsWith('-')
      svgText(group, continues ? l.text.slice(0, -1) : l.text, l.x, lyricY[l.vi], 'lyric')
      const next = lyrics.slice(i + 1).find((n) => n.vi === l.vi)
      if (continues && next) svgText(group, '-', (l.x + next.x) / 2, lyricY[l.vi], 'lyric')
    })
    ctx.closeGroup()

    // getBBox() would include the music font's tall glyph boxes; use known extents instead.
    const boxTop = chordY - 16
    const boxHeight = lyricY.at(-1)! + 8 - boxTop
    const dy = cursorY - boxTop
    group.setAttribute('transform', `translate(0 ${dy})`)
    system.top = cursorY
    system.bottom = cursorY + boxHeight
    system.chordY = chordY + dy
    system.staves.forEach((s) => (s.topLineY += dy))
    for (const n of notes) hit.notes.set(n.id, [...(hit.notes.get(n.id) ?? []), { x: n.x, y: n.y + dy }])
    hit.systems.push(system)
    cursorY += boxHeight + SYSTEM_GAP
  })

  hit.height = cursorY
  renderer.resize(width, cursorY)
  return hit
}
