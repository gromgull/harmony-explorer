import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { keyName, parsePitchClass } from '@/model/pitch'
import { barTicks } from '@/model/time'
import { EIGHTH, type KeySignature } from '@/model/types'
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

/** Key, time, pickup, length and tempo, behind a button that summarises them. */
export function SongSettings() {
  const score = useScoreStore((s) => s.score)
  const dispatch = useScoreStore((s) => s.dispatch)

  const pickupOptions = Array.from({ length: barTicks(score.timeSignature) / EIGHTH }, (_, i) => i)
  const pickupItems = pickupOptions.map((n) => ({ value: String(n * EIGHTH), label: n === 0 ? 'None' : eighthsLabel(n) }))

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" title="Song settings" />}>
        {keyName(score.key)} · {score.timeSignature.beats}/4 · {score.tempo} bpm
        <ChevronDown className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-64 grid-cols-2 gap-3">
        <Field label="Key">
          <Select
            items={KEYS.map((k) => ({ value: k, label: k }))}
            value={keyName(score.key)}
            onValueChange={(v) => v && dispatch({ type: 'setKey', key: parseKey(v) })}
          >
            <SelectTrigger className="w-full">
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
            <SelectTrigger className="w-full">
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
            <SelectTrigger className="w-full">
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
            value={score.measureCount}
            onChange={(e) => e.target.value && dispatch({ type: 'setMeasureCount', measureCount: Number(e.target.value) })}
          />
        </Field>

        <Field label="Tempo">
          <Input
            type="number"
            min={20}
            max={300}
            value={score.tempo}
            onChange={(e) => e.target.value && dispatch({ type: 'setTempo', tempo: Number(e.target.value) })}
          />
        </Field>
      </PopoverContent>
    </Popover>
  )
}
