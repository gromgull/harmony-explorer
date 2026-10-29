import { ChevronDown, Loader2, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { togglePlay } from '@/editor/commands'
import { setBacking, setVoiceSound } from '@/playback/player'
import { usePlaybackStore, VOICE_SOUNDS, type VoiceSound } from '@/store/playback'

/** Play/stop, with the sound options behind the arrow half of the button. */
export function Transport() {
  const status = usePlaybackStore((s) => s.status)
  const voiceSound = usePlaybackStore((s) => s.voiceSound)
  const backing = usePlaybackStore((s) => s.backing)

  return (
    <ButtonGroup>
      <Button onClick={togglePlay} className="w-20" title="Play from the selected note (Space)">
        {status === 'loading' ? <Loader2 className="animate-spin" /> : status === 'playing' ? <Square /> : <Play />}
        {status === 'playing' ? 'Stop' : 'Play'}
      </Button>
      <ButtonGroupSeparator className="bg-primary-foreground/20" />
      <Popover>
        <PopoverTrigger render={<Button size="icon" aria-label="Playback sound" title="Playback sound" />}>
          <ChevronDown />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Voices</Label>
            <Select
              items={VOICE_SOUNDS.map((s) => ({ value: s.id, label: s.label }))}
              value={voiceSound}
              onValueChange={(v) => v && setVoiceSound(v as VoiceSound)}
            >
              <SelectTrigger className="w-28" aria-label="Voice sound">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_SOUNDS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="backing">Guitar backing</Label>
            <Switch id="backing" checked={backing} onCheckedChange={setBacking} />
          </div>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  )
}
