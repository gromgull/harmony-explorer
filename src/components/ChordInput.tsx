import { useEffect, useRef, useState } from 'react'
import { closeChordEdit, nextBeat, openChordEdit, setChordSymbol } from '@/editor/commands'
import { chordText } from '@/model/chord'
import type { Score, Tick } from '@/model/types'
import { cn } from '@/lib/utils'

type Props = { score: Score; tick: Tick; x: number; y: number }

/** Inline chord symbol entry. Enter saves, Tab/Space saves and moves to the next beat, Esc cancels. */
export function ChordInput({ score, tick, x, y }: Props) {
  const existing = score.chords.find((c) => c.start === tick)
  const [text, setText] = useState(existing ? chordText(existing) : '')
  const [invalid, setInvalid] = useState(false)
  const closed = useRef(false) // unmounting blurs the input; don't save again then
  const latest = useRef(text) // for saving on unmount

  // Clicks on the score keep focus here (no blur), then open something else: save on the way out.
  useEffect(
    () => () => {
      if (!closed.current) setChordSymbol(tick, latest.current)
    },
    [tick],
  )

  const close = () => {
    closed.current = true
    closeChordEdit()
  }

  const save = () => {
    const ok = setChordSymbol(tick, text)
    setInvalid(!ok)
    return ok
  }

  return (
    <input
      autoFocus
      value={text}
      placeholder="G7"
      spellCheck={false}
      onChange={(e) => {
        setText(e.target.value)
        latest.current = e.target.value
        setInvalid(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
        else if (e.key === 'Enter') {
          if (save()) close()
        }
        else if (e.key === 'Tab' || e.key === ' ') {
          e.preventDefault()
          if (!save()) return
          closed.current = true
          const next = nextBeat(tick)
          if (next === null) closeChordEdit()
          else openChordEdit(next)
        }
      }}
      onBlur={() => {
        if (!closed.current && save()) close()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'border-input bg-background absolute w-16 rounded border px-1 py-0.5 text-[15px] font-semibold shadow-sm outline-none',
        'focus:ring-ring/50 focus:ring-2',
        invalid && 'border-destructive ring-destructive/30 ring-2',
      )}
      style={{ left: x - 4, top: y - 19 }}
    />
  )
}
