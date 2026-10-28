import { Button } from '@/components/ui/button'
import { DURATIONS, setDuration, toggleDot } from '@/editor/commands'
import { TPQ } from '@/model/types'
import { useEditorStore } from '@/store/editor'

// SMuFL code points in the Bravura font loaded by VexFlow.
const GLYPHS: Record<number, string> = {
  [TPQ / 2]: '',
  [TPQ]: '',
  [TPQ * 2]: '',
  [TPQ * 4]: '',
}
const DOT = ''

const Glyph = ({ children }: { children: string }) => (
  <span className="font-[Bravura] text-[22px] leading-none" style={{ transform: 'translateY(4px)' }}>
    {children}
  </span>
)

export function DurationPalette() {
  const input = useEditorStore((s) => s.inputDuration)
  const dotted = !GLYPHS[input]
  const base = dotted ? input / 1.5 : input

  return (
    <div className="flex gap-1">
      {DURATIONS.map((d) => (
        <Button
          key={d.ticks}
          variant={base === d.ticks ? 'default' : 'outline'}
          size="icon"
          title={`${d.label} (${d.key})`}
          aria-label={d.label}
          onClick={() => setDuration(d.ticks)}
        >
          <Glyph>{GLYPHS[d.ticks]}</Glyph>
        </Button>
      ))}
      <Button
        variant={dotted ? 'default' : 'outline'}
        size="icon"
        title="Dotted (.)"
        aria-label="Dotted"
        disabled={base !== TPQ && base !== TPQ * 2}
        onClick={toggleDot}
      >
        <Glyph>{DOT}</Glyph>
      </Button>
    </div>
  )
}
