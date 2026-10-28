import { nanoid } from 'nanoid'
import { parsePitch, parsePitchClass, pitchClassName, pitchName } from './pitch'
import { EIGHTH, type Chord, type Note, type Score, type Voice } from './types'

/**
 * Share links carry the whole song in the URL fragment: `#song/1/<data>`, where data is
 * compact positional JSON, deflated and base64url-encoded. Ids are dropped (regenerated on
 * import) and generated harmony voices that were not edited keep only their settings.
 * The `1` is the format version; bump it when the layout below changes.
 */
const PREFIX = '#song/1/'

type SharedNote = [start: number, duration: number, pitch: string, lyric?: string]
type SharedChord = [start: number, root: string, quality: string, bass?: string]
type SharedVoice = [id: string, role: Voice['role'], name: string, clef: Voice['clef'], source: Voice['source'], notes?: SharedNote[]]
type SharedScore = [
  title: string,
  beats: Score['timeSignature']['beats'],
  key: [tonic: string, mode: Score['key']['mode']],
  tempo: number,
  pickup: number,
  measureCount: number,
  chords: SharedChord[],
  voices: SharedVoice[],
]

const regenerated = (v: Voice) => v.source.kind === 'generated' && !v.source.edited

function pack(score: Score): SharedScore {
  const note = (n: Note): SharedNote => {
    const packed: SharedNote = [n.start / EIGHTH, n.duration / EIGHTH, pitchName(n.pitch)]
    if (n.lyric) packed.push(n.lyric)
    return packed
  }
  const chord = (c: Chord): SharedChord => {
    const packed: SharedChord = [c.start / EIGHTH, pitchClassName(c.root), c.quality]
    if (c.bass) packed.push(pitchClassName(c.bass))
    return packed
  }
  return [
    score.title,
    score.timeSignature.beats,
    [pitchClassName(score.key.tonic), score.key.mode],
    score.tempo,
    score.pickup / EIGHTH,
    score.measureCount,
    score.chords.map(chord),
    score.voices.map((v) => {
      const packed: SharedVoice = [v.id, v.role, v.name, v.clef, v.source]
      if (!regenerated(v)) packed.push(v.notes.map(note))
      return packed
    }),
  ]
}

function unpack([title, beats, [tonic, mode], tempo, pickup, measureCount, chords, voices]: SharedScore): Score {
  return {
    version: 1,
    title,
    timeSignature: { beats, beatUnit: 4 },
    key: { tonic: parsePitchClass(tonic), mode },
    tempo,
    pickup: pickup * EIGHTH,
    measureCount,
    chords: chords.map(([start, root, quality, bass]) => ({
      id: nanoid(),
      start: start * EIGHTH,
      root: parsePitchClass(root),
      quality,
      ...(bass && { bass: parsePitchClass(bass) }),
    })),
    // Regenerated voices come back empty; syncHarmonies fills them in when the song is shown.
    voices: voices.map(([id, role, name, clef, source, notes = []]) => ({
      id,
      role,
      name,
      clef,
      source,
      notes: notes.map(([start, duration, pitch, lyric]) => ({
        id: nanoid(),
        start: start * EIGHTH,
        duration: duration * EIGHTH,
        pitch: parsePitch(pitch),
        ...(lyric && { lyric }),
      })),
    })),
  }
}

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** The fragment (with `#`) that encodes a song. */
export async function encodeShareHash(score: Score): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(pack(score)))
  return PREFIX + toBase64Url(await transform(json, new CompressionStream('deflate-raw')))
}

export const isShareHash = (hash: string) => hash.startsWith(PREFIX)

/** Decodes a share fragment; null when it is not one or is damaged. */
export async function decodeShareHash(hash: string): Promise<Score | null> {
  if (!isShareHash(hash)) return null
  try {
    const bytes = await transform(fromBase64Url(hash.slice(PREFIX.length)), new DecompressionStream('deflate-raw'))
    return unpack(JSON.parse(new TextDecoder().decode(bytes)) as SharedScore)
  } catch (e) {
    console.error('Could not read shared song', e)
    return null
  }
}
