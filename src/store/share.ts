import { decodeShareHash, encodeShareHash, isShareHash } from '@/model/share'
import { createProject } from './projects'
import { useScoreStore } from './score'

/** A link that opens the current song as a new song for whoever follows it. */
export async function shareLink(): Promise<string> {
  const { origin, pathname, search } = window.location
  return origin + pathname + search + (await encodeShareHash(useScoreStore.getState().score))
}

/** Imports the song in the URL fragment, if any, and clears the fragment so a reload does not import it again. */
export async function openSharedSong() {
  const { hash, pathname, search } = window.location
  if (!isShareHash(hash)) return
  history.replaceState(null, '', pathname + search)
  const score = await decodeShareHash(hash)
  if (score) createProject(score)
}

if (typeof window !== 'undefined') window.addEventListener('hashchange', openSharedSong)
