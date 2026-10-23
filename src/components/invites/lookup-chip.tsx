'use client'

import { useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLookup } from '@/hooks/use-lookup'
import { lookupResult, type LookupResult, type LookupState } from '@/lib/lookup-resolve'
import { LookupPickList } from '@/components/invites/lookup-pick-list'

interface LookupChipProps {
  name: string
  onResolve: (result: LookupResult, state: LookupState) => void
}

// Under a name field: what Base or FuPa knows about that name, as one line. Base first, FuPa only when Base
// has nobody; several hits become a short list to pick from; nothing found says so.
export const LookupChip = ({ name, onResolve }: LookupChipProps) => {
  const { state, busy, pick, notInBase } = useLookup(name)

  useEffect(() => {
    onResolve(lookupResult(state), state)
    // the parent only needs the result when the state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (busy) return <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Suche in Base und FuPa</p>
  if (state.kind === 'idle') return null
  if (state.kind === 'base') {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Badge className={state.match.signed ? 'bg-purple-500/15 text-purple-700 border-purple-500/30' : 'bg-gray-500/10 text-gray-600 border-gray-400/30'}>{state.match.signed ? 'Signed' : 'Neu'}</Badge>
        <span className="text-muted-foreground">In Base: {state.match.name}{state.match.club ? ` · ${state.match.club}` : ''}{state.match.birth_year ? ` · ${state.match.birth_year}` : ''}</span>
        <button type="button" onClick={notInBase} aria-label="Nicht dieser Spieler" className="rounded p-0.5 text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
      </p>
    )
  }
  if (state.kind === 'fupa') {
    const c = state.candidate
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Badge className="bg-gray-500/10 text-gray-600 border-gray-400/30">Neu</Badge>
        <span className="text-muted-foreground">FuPa: {[c.club ?? 'ohne Verein', c.region, c.birth_year ? `Jg. ${c.birth_year}` : null].filter(Boolean).join(' · ')}</span>
        <button type="button" onClick={() => pick({ kind: 'none' })} aria-label="Nicht dieser Spieler" className="rounded p-0.5 text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
      </p>
    )
  }
  if (state.kind === 'base-pick' || state.kind === 'fupa-pick') return <LookupPickList state={state} onPick={pick} onNone={state.kind === 'base-pick' ? notInBase : () => pick({ kind: 'none' })} />
  return <p className="text-sm text-muted-foreground">Nicht gefunden. Du kannst einen FuPa- oder Transfermarkt-Link einfügen</p>
}
