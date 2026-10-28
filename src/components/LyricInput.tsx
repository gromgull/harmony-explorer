import { useRef, useState } from 'react'
import { closeLyricEdit, lyricNeighbor, openLyricEdit, pasteLyrics, setLyric } from '@/editor/commands'
import type { NoteId, Score } from '@/model/types'

type Props = { score: Score; noteId: NoteId; x: number; y: number }

/**
 * MuseScore-style lyric entry. Space ends the word and moves on, "-" adds a
 * hyphen and moves on, "_" or Space on an empty box skips a note (melisma),
 * Shift+Space goes back, Enter finishes, Esc cancels this syllable.
 */
export function LyricInput({ score, noteId, x, y }: Props) {
  const existing = score.voices.flatMap((v) => v.notes).find((n) => n.id === noteId)?.lyric ?? ''
  const [text, setText] = useState(existing.replace(/-$/, ''))
  const hyphen = useRef(existing.endsWith('-'))
  const closed = useRef(false) // unmounting blurs the input; don't save again then

  const moveTo = (id: NoteId | null) => {
    closed.current = true
    if (id) openLyricEdit(id)
    else closeLyricEdit()
  }

  return (
    <input
      autoFocus
      // Select an existing syllable so typing replaces it.
      onFocus={(e) => e.target.select()}
      value={text}
      spellCheck={false}
      onChange={(e) => setText(e.target.value.replace(/[\s_-]/g, ''))}
      onKeyDown={(e) => {
        const next = () => lyricNeighbor(noteId, 1)
        if (e.key === ' ' && e.shiftKey) {
          e.preventDefault()
          setLyric(noteId, text, hyphen.current)
          moveTo(lyricNeighbor(noteId, -1))
        } else if (e.key === ' ' || e.key === 'Tab') {
          e.preventDefault()
          setLyric(noteId, text, false)
          moveTo(next())
        } else if (e.key === '-') {
          e.preventDefault()
          setLyric(noteId, text, true)
          moveTo(next())
        } else if (e.key === '_') {
          e.preventDefault()
          setLyric(noteId, text, hyphen.current)
          moveTo(next())
        } else if (e.key === 'Enter') {
          setLyric(noteId, text, hyphen.current)
          moveTo(null)
        } else if (e.key === 'Escape') {
          moveTo(null)
        }
      }}
      onPaste={(e) => {
        const pasted = e.clipboardData.getData('text')
        if (!/[\s-]/.test(pasted.trim())) return // a single syllable: paste normally
        e.preventDefault()
        moveTo(pasteLyrics(noteId, pasted))
      }}
      onBlur={() => {
        if (!closed.current) {
          setLyric(noteId, text, hyphen.current)
          closeLyricEdit()
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="border-input bg-background focus:ring-ring/50 absolute w-20 rounded border px-1 py-0.5 text-center text-[13px] shadow-sm outline-none focus:ring-2"
      style={{ left: x - 40, top: y - 17 }}
    />
  )
}
