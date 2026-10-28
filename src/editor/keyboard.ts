import { useEffect } from 'react'
import * as cmd from './commands'

type Binding = { key: string; mod?: boolean; shift?: boolean; run: () => void }

// MuseScore-style bindings. Add more here; all logic lives in commands.ts.
const BINDINGS: Binding[] = [
  ...cmd.DURATIONS.map((d) => ({ key: d.key, run: () => cmd.setDuration(d.ticks) })),
  { key: '.', run: cmd.toggleDot },
  { key: 'Delete', run: cmd.deleteSelection },
  { key: 'Backspace', run: cmd.deleteSelection },
  { key: 'Escape', run: cmd.clearSelection },
  { key: ' ', run: cmd.togglePlay },
  { key: 'ArrowUp', run: () => cmd.transposeSelection(1) },
  { key: 'ArrowDown', run: () => cmd.transposeSelection(-1) },
  { key: 'ArrowLeft', run: () => cmd.selectAdjacent(-1) },
  { key: 'ArrowRight', run: () => cmd.selectAdjacent(1) },
  { key: 'z', mod: true, run: cmd.undo },
  { key: 'z', mod: true, shift: true, run: cmd.redo },
  { key: 'y', mod: true, run: cmd.redo },
]

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable]')) return
      const mod = e.metaKey || e.ctrlKey
      const binding = BINDINGS.find(
        (b) => b.key.toLowerCase() === e.key.toLowerCase() && !!b.mod === mod && !!b.shift === e.shiftKey,
      )
      if (!binding) return
      e.preventDefault()
      binding.run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
