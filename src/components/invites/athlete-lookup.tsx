'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface AthleteMatch {
  id: string
  name: string
  club: string | null
  birth_year: number | null
  stage: string | null
  phone: string | null
  signed: boolean
  signed_date: string | null
}

interface AthleteLookupProps {
  name: string
  onName: (value: string) => void
  linked: AthleteMatch | null
  onLink: (match: AthleteMatch | null) => void
  disabled?: boolean
}

// Name field of the invite form with a Base lookup underneath: two letters start the search,
// picking a row links the invite to that athlete (read only; Base is not changed).
export const AthleteLookup = ({ name, onName, linked, onLink, disabled }: AthleteLookupProps) => {
  const [matches, setMatches] = useState<AthleteMatch[]>([])
  const [open, setOpen] = useState(false)
  const query = name.trim()
  const visible = open && !linked && query.length >= 2 && matches.length > 0

  useEffect(() => {
    if (linked || query.length < 2) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/athletes?q=${encodeURIComponent(query)}`, { signal: ctrl.signal, cache: 'no-store' })
        if (res.ok) setMatches(await res.json())
      } catch {
        // aborted by the next keystroke, or offline: no list
      }
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, linked])

  return (
    <div className="relative space-y-1.5">
      <Label htmlFor="inv-name">Player name *</Label>
      <Input
        id="inv-name"
        value={name}
        onChange={(e) => onName(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Vorname Nachname"
        autoComplete="off"
        disabled={disabled}
      />
      {linked ? (
        <div className="flex items-center gap-2 text-sm">
          <Badge className={linked.signed ? 'bg-purple-500/15 text-purple-700 border-purple-500/30' : 'bg-gray-500/10 text-gray-600 border-gray-400/30'}>
            {linked.signed ? 'Signed' : 'New'}
          </Badge>
          <span className="text-muted-foreground">
            Linked to Base: {linked.name}
            {linked.club ? ` · ${linked.club}` : ''}
            {linked.birth_year ? ` · ${linked.birth_year}` : ''}
          </span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Unlink" onClick={() => onLink(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Type to search Base; pick a row to link and prefill the player&apos;s form.</p>
      )}
      {visible && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onLink(m)
                  onName(m.name)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">
                  {m.name}
                  <span className="text-muted-foreground">{[m.club, m.birth_year].filter(Boolean).map((v) => ` · ${v}`).join('')}</span>
                </span>
                <Badge className={m.signed ? 'shrink-0 bg-purple-500/15 text-purple-700 border-purple-500/30' : 'shrink-0 bg-gray-500/10 text-gray-600 border-gray-400/30'}>
                  {m.signed ? `Signed${m.signed_date ? ` ${m.signed_date.slice(0, 4)}` : ''}` : m.stage ?? 'New'}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
