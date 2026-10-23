'use client'

import { Badge } from '@/components/ui/badge'
import type { LookupState } from '@/lib/lookup-resolve'

interface LookupPickListProps {
  state: Extract<LookupState, { kind: 'base-pick' | 'fupa-pick' }>
  onPick: (next: LookupState) => void
  onNone: () => void
}

// Several Base rows or FuPa hits for one name: staff picks the right one, or none of them
export const LookupPickList = ({ state, onPick, onNone }: LookupPickListProps) => (
  <div className="rounded-md border border-dashed p-2 text-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">{state.kind === 'base-pick' ? 'Which one in Base?' : `FuPa: ${state.candidates.length} hits, which one?`}</span>
      <button type="button" onClick={onNone} className="text-xs text-muted-foreground underline">{state.kind === 'base-pick' ? 'None of these' : 'Not on FuPa'}</button>
    </div>
    <ul className="mt-1 space-y-1">
      {state.kind === 'base-pick'
        ? state.matches.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick({ kind: 'base', match: m, auto: false })} className="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-left hover:bg-accent">
                <span className="truncate">{m.name}<span className="text-muted-foreground">{[m.club, m.birth_year].filter(Boolean).map((v) => ` · ${v}`).join('')}</span></span>
                <Badge className={m.signed ? 'shrink-0 bg-purple-500/15 text-purple-700 border-purple-500/30' : 'shrink-0 bg-gray-500/10 text-gray-600 border-gray-400/30'}>{m.signed ? 'Signed' : m.stage ?? 'New'}</Badge>
              </button>
            </li>
          ))
        : state.candidates.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick({ kind: 'fupa', candidate: c, auto: false })} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-accent">
                {(c.club_image || c.image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.club_image ?? c.image ?? ''} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
                )}
                <span className="truncate"><span className="font-medium">{c.club ?? 'no club'}</span><span className="text-muted-foreground">{[c.region, c.district, c.position, c.birth_year ? `born ${c.birth_year}` : null].filter(Boolean).map((x) => ` · ${x}`).join('')}</span></span>
              </button>
            </li>
          ))}
    </ul>
  </div>
)
