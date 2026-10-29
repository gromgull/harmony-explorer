import { useEffect, useRef, useState } from 'react'
import { closeLyricEdit, lyricNeighbor, openLyricEdit, pasteLyrics, setLyric } from '@/editor/commands'
import type { NoteId, Score } from '@/model/types'

type Props = { score: Score; noteId: NoteId; caret?: 'start' | 'end'; x: number; y: number }

/**
 * MuseScore-style lyric entry. Space ends the word and moves on, "-" adds a
 * hyphen and moves on, "_" or Space on an empty box skips a note (melisma),
 * Shift+Space goes back, Enter finishes, Esc cancels this syllable. Left/Right
 * at either end of the text and Backspace in an empty box move to the neighbour.
 */
export function LyricInput({ score, noteId, caret, x, y }: Props) {
  const existing = score.voices.flatMap((v) => v.notes).find((n) => n.id === noteId)?.lyric ?? ''
  const [text, setText] = useState(existing.replace(/-$/, ''))
  const hyphen = useRef(existing.endsWith('-'))
  const closed = useRef(false) // unmounting blurs the input; don't save again then
  const latest = useRef(text) // for saving on unmount

  // Clicks on the score keep focus here (no blur), then open something else: save on the way out.
  useEffect(
    () => () => {
      if (!closed.current) setLyric(noteId, latest.current, hyphen.current)
    },
    [noteId],
  )

  const moveTo = (id: NoteId | null, caretAt?: 'start' | 'end') => {
    closed.current = true
    if (id) openLyricEdit(id, caretAt)
    else closeLyricEdit()
  }

  return (
    <input
      autoFocus
      // Select an existing syllable so typing replaces it, unless arriving with the arrow keys.
      onFocus={(e) => {
        if (!caret) return e.target.select()
        const at = caret === 'start' ? 0 : e.target.value.length
        e.target.setSelectionRange(at, at)
      }}
      value={text}
      spellCheck={false}
      onChange={(e) => {
        latest.current = e.target.value.replace(/[\s_-]/g, '')
        setText(latest.current)
      }}
      onKeyDown={(e) => {
        const next = () => lyricNeighbor(noteId, 1)
        const { selectionStart, selectionEnd } = e.currentTarget
        const atStart = selectionStart === 0 && selectionEnd === 0
        const atEnd = selectionStart === text.length && selectionEnd === text.length
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
        } else if (e.key === 'ArrowLeft' && atStart) {
          const prev = lyricNeighbor(noteId, -1)
          if (!prev) return
          e.preventDefault()
          setLyric(noteId, text, hyphen.current)
          moveTo(prev, 'end')
        } else if (e.key === 'ArrowRight' && atEnd) {
          const following = next()
          if (!following) return
          e.preventDefault()
          setLyric(noteId, text, hyphen.current)
          moveTo(following, 'start')
        } else if (e.key === 'Backspace' && text === '') {
          const prev = lyricNeighbor(noteId, -1)
          if (!prev) return
          e.preventDefault()
          setLyric(noteId, '', false)
          moveTo(prev, 'end')
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
      className="border-input bg-background focus:ring-ring/50 absolute w-20 rounded border px-1 py-0.5 text-center font-lyric text-[16px] font-semibold shadow-sm outline-none focus:ring-2"
      style={{ left: x - 40, top: y - 17 }}
    />
  )
}
