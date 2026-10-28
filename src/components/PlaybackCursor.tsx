import { useEffect, useRef } from 'react'
import { interpolateX } from '@/engrave/geometry'
import { SELECTED, type HitMap } from '@/engrave/render'
import { usePlaybackStore } from '@/store/playback'

function locateTick(hit: HitMap, tick: number) {
  for (const [system, s] of hit.systems.entries()) {
    const m = s.measures.find((m) => tick >= m.start && tick < m.end)
    if (m) return { x: interpolateX(m.ticks, tick), top: s.top, bottom: s.bottom, system }
  }
  return null
}

/** A line that follows playback; scrolls the page when it moves to a new system. */
export function PlaybackCursor({ hit }: { hit: HitMap }) {
  const tick = usePlaybackStore((s) => s.tick)
  const line = useRef<SVGLineElement>(null)

  const pos = tick === null ? null : locateTick(hit, tick)
  const system = pos?.system ?? null

  useEffect(() => {
    if (system === null || !line.current) return
    const rect = line.current.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      window.scrollBy({ top: rect.top - window.innerHeight / 3, behavior: 'smooth' })
    }
  }, [system])

  if (!pos) return null
  const { x, top, bottom } = pos
  return <line ref={line} x1={x} x2={x} y1={top} y2={bottom} stroke={SELECTED} strokeWidth={2} opacity={0.6} pointerEvents="none" />
}
