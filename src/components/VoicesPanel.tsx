import { RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { regenerate, setHarmony } from '@/editor/commands'
import type { HarmonyRole } from '@/harmony/trio'
import type { Voice } from '@/model/types'
import { toggleMute } from '@/playback/player'
import { usePlaybackStore } from '@/store/playback'
import { useScoreStore } from '@/store/score'

const HARMONIES: { role: HarmonyRole; label: string; hint: string }[] = [
  { role: 'tenor', label: 'Tenor', hint: 'nearest chord tone above the lead' },
  { role: 'baritone', label: 'Baritone', hint: 'the remaining chord tone, below the lead' },
  { role: 'bass', label: 'Bass', hint: 'chord roots' },
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

export function VoicesPanel() {
  const voices = useScoreStore((s) => s.score.voices)
  const lead = voices.find((v) => v.role === 'lead')

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground text-xs">Voices</span>
      {lead && (
        <div className="flex items-center gap-1">
          <span className="font-medium">Lead</span>
          <MuteButton voice={lead} />
        </div>
      )}
      {HARMONIES.map(({ role, label, hint }) => {
        const voice = voices.find((v) => v.role === role)
        const source = voice?.source.kind === 'generated' ? voice.source : null
        return (
          <div key={role} className="flex items-center gap-2">
            <Switch id={`voice-${role}`} checked={!!voice} onCheckedChange={(on) => setHarmony(role, on)} />
            <Label htmlFor={`voice-${role}`} title={hint}>
              {label}
            </Label>
            {voice && <MuteButton voice={voice} />}
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
          </div>
        )
      })}
    </div>
  )
}
