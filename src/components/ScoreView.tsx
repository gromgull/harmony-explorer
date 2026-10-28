import { useEffect, useRef, useState } from 'react'
import { fontsReady } from '@/engrave/fonts'
import { renderScore } from '@/engrave/render'
import type { Score } from '@/model/types'

export function ScoreView({ score }: { score: Score }) {
  const wrapper = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    try {
      renderScore(canvas.current!, score, width)
      setError(null)
    } catch (e) {
      console.error(e)
      setError(String(e))
    }
  }, [score, width, ready])

  return (
    <div ref={wrapper} className="w-full">
      {error && <p className="text-destructive text-sm">Render error: {error}</p>}
      <div ref={canvas} className="score" />
    </div>
  )
}
