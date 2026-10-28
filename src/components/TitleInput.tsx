import { useState } from 'react'
import { useScoreStore } from '@/store/score'

/** The song title; click to rename. */
export function TitleInput() {
  const title = useScoreStore((s) => s.score.title)
  const dispatch = useScoreStore((s) => s.dispatch)
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    const next = draft?.trim()
    if (next && next !== title) dispatch({ type: 'setTitle', title: next })
    setDraft(null)
  }

  if (draft === null) {
    return (
      <h1 className="cursor-text truncate text-2xl font-semibold" title="Rename" onClick={() => setDraft(title)}>
        {title || 'Untitled'}
      </h1>
    )
  }
  return (
    <input
      autoFocus
      aria-label="Song title"
      className="focus:ring-ring/50 -mx-1 min-w-0 rounded px-1 text-2xl font-semibold outline-none focus:ring-2"
      value={draft}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}
