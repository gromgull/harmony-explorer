import { Soundfont } from 'smplr'
import { toMidi } from '@/model/pitch'
import { scoreLength } from '@/model/time'
import type { Pitch, Score, Tick } from '@/model/types'
import { usePlaybackStore, type VoiceSound } from '@/store/playback'
import { scoreEvents, secondsToTicks, ticksToSeconds, type PlaybackEvent } from './events'

type Instrument = ReturnType<typeof Soundfont>

const LOOKAHEAD = 0.25 // seconds of audio scheduled ahead
const INTERVAL = 50 // ms between scheduling passes
const START_DELAY = 0.08

let context: AudioContext | null = null
const instruments = new Map<string, Promise<Instrument>>()
const setState = usePlaybackStore.setState

function audio() {
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

function instrument(name: string, volume = 100): Promise<Instrument> {
  let inst = instruments.get(name)
  if (!inst) {
    inst = Soundfont(audio(), { instrument: name, volume }).load as Promise<Instrument>
    instruments.set(name, inst)
  }
  return inst
}

const backingGuitar = () => instrument('acoustic_guitar_steel', 90)
const voiceInstrument = () => instrument(usePlaybackStore.getState().voiceSound)

/** Starts loading the sounds; call from a user gesture so the AudioContext may start. */
export function warmUp() {
  void voiceInstrument()
  void backingGuitar()
}

export function setVoiceSound(voiceSound: VoiceSound) {
  stop()
  setState({ voiceSound })
  void voiceInstrument()
}

export function setBacking(backing: boolean) {
  setState({ backing })
}

/** Plays a single note, e.g. while editing. Silent until the sound has loaded. */
export function preview(pitch: Pitch) {
  if (usePlaybackStore.getState().status === 'playing') return
  void voiceInstrument().then((inst) => {
    inst.stop()
    inst.start({ note: toMidi(pitch), duration: 0.6, velocity: 90 })
  })
}

// ---- transport ----

let session: { timer: number; frame: number; stopAll: () => void } | null = null

export async function play(score: Score, from: Tick = 0) {
  stop()
  setState({ status: 'loading', tick: from })
  const { backing } = usePlaybackStore.getState()
  const [voice, guitar] = await Promise.all([voiceInstrument(), backing ? backingGuitar() : null])
  if (usePlaybackStore.getState().status !== 'loading') return // stopped while loading

  const ctx = audio()
  const events = scoreEvents(score, from, backing)
  const end = scoreLength(score)
  const t0 = ctx.currentTime + START_DELAY
  const timeOf = (tick: Tick) => t0 + ticksToSeconds(tick - from, score.tempo)
  let next = 0

  const schedule = () => {
    const horizon = ctx.currentTime + LOOKAHEAD
    while (next < events.length && timeOf(events[next].tick) < horizon) {
      const e: PlaybackEvent = events[next++]
      const inst = e.part === 'voice' ? voice : guitar!
      // A small spread per string makes the strum sound strummed.
      const spread = (e.strumIndex ?? 0) * 0.012
      inst.start({
        note: e.midi,
        time: timeOf(e.tick) + spread,
        duration: ticksToSeconds(e.durationTicks, score.tempo) * (e.part === 'voice' ? 0.95 : 1),
        velocity: e.velocity,
      })
    }
  }

  const tickNow = () => from + secondsToTicks(Math.max(0, ctx.currentTime - t0), score.tempo)
  const animate = () => {
    const tick = tickNow()
    if (tick >= end) {
      stop()
      return
    }
    setState({ tick })
    session!.frame = requestAnimationFrame(animate)
  }

  schedule()
  session = {
    timer: window.setInterval(schedule, INTERVAL),
    frame: requestAnimationFrame(animate),
    stopAll: () => {
      voice.stop()
      guitar?.stop()
    },
  }
  setState({ status: 'playing' })
}

export function stop() {
  if (session) {
    clearInterval(session.timer)
    cancelAnimationFrame(session.frame)
    session.stopAll()
    session = null
  }
  setState({ status: 'stopped', tick: null })
}
