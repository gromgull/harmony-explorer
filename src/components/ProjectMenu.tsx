import { Check, Copy, Link, Menu, Music, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { emptyScore, EXAMPLES } from '@/model/sample'
import { createProject, deleteProject, duplicateProject, openProject, useProjectsStore } from '@/store/projects'
import { shareLink } from '@/store/share'

export function ProjectMenu() {
  const projects = useProjectsStore((s) => s.projects)
  const currentId = useProjectsStore((s) => s.currentId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const current = projects.find((p) => p.id === currentId)

  return (
    <>
      <DropdownMenu onOpenChange={() => setCopied(false)}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Songs" />}>
          <Menu />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Songs</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={currentId ?? ''} onValueChange={(id) => openProject(String(id))}>
              {projects.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id} closeOnClick>
                  <span className="truncate">{p.title || 'Untitled'}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => createProject(emptyScore())}>
            <Plus /> New song
          </DropdownMenuItem>
          <DropdownMenuItem onClick={duplicateProject}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          {/* Stays open to confirm the copy. */}
          <DropdownMenuItem
            closeOnClick={false}
            onClick={async () => {
              await navigator.clipboard.writeText(await shareLink())
              setCopied(true)
            }}
          >
            {copied ? <Check /> : <Link />} {copied ? 'Link copied' : 'Copy share link'}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Music /> Examples
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {EXAMPLES.map((e) => (
                <DropdownMenuItem key={e.title} onClick={() => createProject(e.make())}>
                  {e.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete song…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{current?.title || 'Untitled'}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the song from this browser. It can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (currentId) deleteProject(currentId)
                setConfirmDelete(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
