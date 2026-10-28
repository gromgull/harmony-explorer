import { create } from 'zustand'
import type { Tick } from '@/model/types'

export const VOICE_SOUNDS = [
  { id: 'acoustic_grand_piano', label: 'Piano' },
  { id: 'choir_aahs', label: 'Choir' },
  { id: 'voice_oohs', label: 'Oohs' },
  { id: 'fiddle', label: 'Fiddle' },
] as const

export type VoiceSound = (typeof VOICE_SOUNDS)[number]['id']

type PlaybackStore = {
  status: 'stopped' | 'loading' | 'playing'
  tick: Tick | null // playback cursor
  voiceSound: VoiceSound
  backing: boolean // boom-chuck guitar on the chords
  muted: string[] // voice ids
}

export const usePlaybackStore = create<PlaybackStore>()(() => ({
  status: 'stopped',
  tick: null,
  voiceSound: 'acoustic_grand_piano',
  backing: true,
  muted: [],
}))

if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { playbackStore: usePlaybackStore })
