import { create } from 'zustand'
import { TPQ, type NoteId, type Tick } from '@/model/types'

/** UI state that is not part of the document (and not in undo history). */
type EditorStore = {
  selection: NoteId[]
  inputDuration: Tick // duration of newly inserted notes
  chordEdit: { tick: Tick } | null // open chord symbol input
}

export const useEditorStore = create<EditorStore>()(() => ({
  selection: [],
  inputDuration: TPQ,
  chordEdit: null,
}))
