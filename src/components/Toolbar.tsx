import { CircleHelp, Redo2, Undo2 } from 'lucide-react'
import { useStore } from 'zustand'
import { DurationPalette } from '@/components/DurationPalette'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { redo, undo } from '@/editor/commands'
import { useScoreStore } from '@/store/score'

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">{children}</kbd>
)

const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'

// Keys joined by `range` read as "3–6"; otherwise they are alternatives.
const SHORTCUTS: { keys: string[]; action: string; range?: boolean }[] = [
  { keys: ['3', '6'], action: 'note duration', range: true },
  { keys: ['.'], action: 'dot' },
  { keys: ['↑', '↓'], action: 'semitone up / down' },
  { keys: ['←', '→'], action: 'select previous / next' },
  { keys: ['Del'], action: 'delete' },
  { keys: [`${MOD}L`], action: 'lyrics for the selected note' },
  { keys: [`${MOD}Z`], action: 'undo' },
  { keys: [`${MOD}Y`, `${MOD}⇧Z`], action: 'redo' },
  { keys: ['Esc'], action: 'clear selection' },
  { keys: ['Space'], action: 'play / stop' },
]

function Help() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="Help" title="Help" />}>
        <CircleHelp />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 text-xs">
        <p>Click to add notes, drag to change pitch. Click above the staff for chords, below the lead for lyrics.</p>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
          {SHORTCUTS.map(({ keys, action, range }) => (
            <div key={action} className="contents">
              <dt className="flex items-center gap-1 whitespace-nowrap">
                {keys.map((k, i) => (
                  <span key={k} className="contents">
                    {range && i > 0 && '–'}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </dt>
              <dd className="text-muted-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}

/** Note entry tools; song settings and voices live in the header. */
export function Toolbar() {
  const canUndo = useStore(useScoreStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useScoreStore.temporal, (s) => s.futureStates.length > 0)

  return (
    <div className="flex items-center gap-4">
      <DurationPalette />
      <div className="flex gap-1">
        <Button variant="outline" size="icon" onClick={() => undo()} disabled={!canUndo} aria-label="Undo">
          <Undo2 />
        </Button>
        <Button variant="outline" size="icon" onClick={() => redo()} disabled={!canRedo} aria-label="Redo">
          <Redo2 />
        </Button>
      </div>
      <div className="ml-auto">
        <Help />
      </div>
    </div>
  )
}
