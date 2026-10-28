import { Redo2, Undo2 } from 'lucide-react'
import { useStore } from 'zustand'
import { DurationPalette } from '@/components/DurationPalette'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { keyName, parsePitchClass } from '@/model/pitch'
import { barTicks } from '@/model/time'
import { EIGHTH, type KeySignature } from '@/model/types'
import { redo, undo } from '@/editor/commands'
import { useScoreStore } from '@/store/score'

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Am', 'Em', 'Bm', 'F#m', 'Dm', 'Gm', 'Cm']

const parseKey = (name: string): KeySignature => {
  const minor = name.endsWith('m')
  return { tonic: parsePitchClass(minor ? name.slice(0, -1) : name), mode: minor ? 'minor' : 'major' }
}

const eighthsLabel = (n: number) => (n % 2 === 0 ? `${n / 2} beat${n === 2 ? '' : 's'}` : `${n / 2} beats`)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {children}
    </div>
  )
}

export function Toolbar() {
  const score = useScoreStore((s) => s.score)
  const dispatch = useScoreStore((s) => s.dispatch)
  const canUndo = useStore(useScoreStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useScoreStore.temporal, (s) => s.futureStates.length > 0)

  const pickupOptions = Array.from({ length: barTicks(score.timeSignature) / EIGHTH }, (_, i) => i)
  const pickupItems = pickupOptions.map((n) => ({ value: String(n * EIGHTH), label: n === 0 ? 'None' : eighthsLabel(n) }))

  return (
    <div className="flex flex-wrap items-end gap-4">
      <Field label="Key">
        <Select
          items={KEYS.map((k) => ({ value: k, label: k }))}
          value={keyName(score.key)}
          onValueChange={(v) => v && dispatch({ type: 'setKey', key: parseKey(v) })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Time">
        <Select
          items={[{ value: '3', label: '3/4' }, { value: '4', label: '4/4' }]}
          value={String(score.timeSignature.beats)}
          onValueChange={(v) =>
            v && dispatch({ type: 'setTimeSignature', timeSignature: { beats: Number(v) as 3 | 4, beatUnit: 4 } })
          }
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3/4</SelectItem>
            <SelectItem value="4">4/4</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Pickup">
        <Select
          items={pickupItems}
          value={String(score.pickup)}
          onValueChange={(v) => v !== null && dispatch({ type: 'setPickup', pickup: Number(v) })}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pickupItems.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Bars">
        <Input
          type="number"
          min={1}
          max={200}
          className="w-20"
          value={score.measureCount}
          onChange={(e) => e.target.value && dispatch({ type: 'setMeasureCount', measureCount: Number(e.target.value) })}
        />
      </Field>

      <Field label="Tempo">
        <Input
          type="number"
          min={20}
          max={300}
          className="w-20"
          value={score.tempo}
          onChange={(e) => e.target.value && dispatch({ type: 'setTempo', tempo: Number(e.target.value) })}
        />
      </Field>

      <Field label="Note">
        <DurationPalette />
      </Field>

      <div className="ml-auto flex gap-1">
        <Button variant="outline" size="icon" onClick={() => undo()} disabled={!canUndo} aria-label="Undo">
          <Undo2 />
        </Button>
        <Button variant="outline" size="icon" onClick={() => redo()} disabled={!canRedo} aria-label="Redo">
          <Redo2 />
        </Button>
      </div>
    </div>
  )
}
