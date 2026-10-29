import { ChevronDown, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { regenerate, setHarmony } from '@/editor/commands'
import type { HarmonyRole } from '@/harmony/trio'
import type { Voice } from '@/model/types'
import { toggleMute } from '@/playback/player'
import { usePlaybackStore } from '@/store/playback'
import { useScoreStore } from '@/store/score'

const HARMONIES: { role: HarmonyRole; label: string; short: string; hint: string }[] = [
  { role: 'tenor', label: 'Tenor', short: 'T', hint: 'nearest chord tone above the lead' },
  { role: 'baritone', label: 'Baritone', short: 'Bar', hint: 'the remaining chord tone, below the lead' },
  { role: 'bass', label: 'Bass', short: 'B', hint: 'chord roots' },
]

function MuteButton({ voice }: { voice: Voice }) {
  const muted = usePlaybackStore((s) => s.muted.includes(voice.id))
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => toggleMute(voice.id)}
      aria-label={muted ? `Unmute ${voice.name}` : `Mute ${voice.name}`}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? <VolumeX className="text-muted-foreground" /> : <Volume2 />}
    </Button>
  )
}

/** Harmony parts and per-voice mute, behind a button that lists the voices in use. */
export function VoicesPanel() {
  const voices = useScoreStore((s) => s.score.voices)
  const lead = voices.find((v) => v.role === 'lead')
  const summary = ['L', ...HARMONIES.filter((h) => voices.some((v) => v.role === h.role)).map((h) => h.short)].join(' ')

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" title="Voices" />}>
        Voices <span className="text-muted-foreground">{summary}</span>
        <ChevronDown className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-1 text-sm">
        {lead && (
          <div className="flex h-8 items-center gap-2">
            <span className="w-8" />
            <span className="flex-1 font-medium">Lead</span>
            <MuteButton voice={lead} />
          </div>
        )}
        {HARMONIES.map(({ role, label, hint }) => {
          const voice = voices.find((v) => v.role === role)
          const source = voice?.source.kind === 'generated' ? voice.source : null
          return (
            <div key={role} className="flex h-8 items-center gap-2">
              <Switch id={`voice-${role}`} checked={!!voice} onCheckedChange={(on) => setHarmony(role, on)} />
              <Label htmlFor={`voice-${role}`} title={hint} className="flex-1">
                {label}
              </Label>
              {voice && role === 'baritone' && (
                <Button
                  variant={source?.highBaritone ? 'secondary' : 'ghost'}
                  size="xs"
                  onClick={() => regenerate(voice.id, !source?.highBaritone)}
                  title="High baritone: an octave up, above the tenor"
                >
                  High
                </Button>
              )}
              {source?.edited && (
                <Button variant="outline" size="xs" onClick={() => regenerate(voice!.id)} title="Edited by hand. Regenerate?">
                  <RotateCcw /> Regenerate
                </Button>
              )}
              {voice && <MuteButton voice={voice} />}
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
