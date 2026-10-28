# Harmony Explorer

A small web tool for exploring vocal harmony lines for bluegrass songs.
Enter a melody, chords and lyrics, and it writes the classic trio parts
(tenor, baritone, bass) for you to look at, listen to and sing along with.

**Try it:** https://gromgull.github.io/harmony-explorer/

## Features

- Notation editor: click to add notes, drag to change pitch, MuseScore-style keys
  (`3`–`6` durations, `.` dot, arrows, `Space` to play)
- Chord symbols above the staff, lyrics below the lead (space/hyphen moves on)
- Playback with a boom-chuck guitar backing; mute any voice to practise your part
- Standard harmony: tenor on the nearest chord tone above the lead, baritone on the
  remaining one below (or high baritone), bass on the chord roots
- Songs are stored in your browser (localStorage); nothing leaves your machine

## Development

Requires Node 22 and pnpm.

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm test     # vitest
pnpm build    # production build in dist/
```

Built with React, TypeScript, Vite, shadcn/ui, [VexFlow](https://www.vexflow.com/)
for engraving, [tonal](https://github.com/tonaljs/tonal) for music theory and
[smplr](https://github.com/danigb/smplr) for playback.

The code is organized as:

| Directory       | Contents                                                            |
| --------------- | ------------------------------------------------------------------- |
| `src/model`     | Score data model and pure edit operations                           |
| `src/engrave`   | Layout (bars, rests, ties) and VexFlow rendering                    |
| `src/editor`    | Commands, hit-testing, keyboard bindings                            |
| `src/harmony`   | Harmony generation                                                  |
| `src/playback`  | Score to timed events, audio scheduling                             |
| `src/store`     | Zustand stores: score (with undo), editor, playback, saved songs     |

## Example songs

- *Amazing Grace* (John Newton, 1779; tune *New Britain*), public domain.
- *Keep on the Sunny Side* (Ada Blenkhorn and J. Howard Entwisle, 1899), public domain.
  Melody and chords after the transcription on
  [abcnotation.com](https://abcnotation.com/tunePage?a=trillian.mit.edu/~jc/music/abc/mirror/mindspring.com/~thornton.rose/KeepOnTheSunnySide/0000).

## License

[GPL-3.0-or-later](LICENSE)
