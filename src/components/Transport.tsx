import { Loader2, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { togglePlay } from '@/editor/commands'
import { setBacking, setVoiceSound } from '@/playback/player'
import { usePlaybackStore, VOICE_SOUNDS, type VoiceSound } from '@/store/playback'

export function Transport() {
  const status = usePlaybackStore((s) => s.status)
  const voiceSound = usePlaybackStore((s) => s.voiceSound)
  const backing = usePlaybackStore((s) => s.backing)

  return (
    <div className="flex items-center gap-3">
      <Button onClick={togglePlay} className="w-24" title="Play from the selected note (Space)">
        {status === 'loading' ? <Loader2 className="animate-spin" /> : status === 'playing' ? <Square /> : <Play />}
        {status === 'playing' ? 'Stop' : 'Play'}
      </Button>
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
      <div className="flex items-center gap-2">
        <Switch id="backing" checked={backing} onCheckedChange={setBacking} />
        <Label htmlFor="backing">Guitar</Label>
      </div>
    </div>
  )
}
