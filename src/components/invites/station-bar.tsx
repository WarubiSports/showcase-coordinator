'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAIR_GRID, SPRINT_GRID } from '@/components/invites/station-rows'
import { SPRINT_SPLITS } from '@/lib/selection-tests'
import { STATIONS, type Station } from '@/lib/test-stations'

interface StationBarProps {
  station: Station
  onStation: (station: Station) => void
  // Players with a value at each station (Bewertung: with an own evaluation), out of total
  counts: Record<Station, number>
  total: number
  query: string
  onQuery: (query: string) => void
  // Evaluations typed but not saved, maybe in a closed line or behind another station
  unsavedEvaluations: number
}

const HINTS: Record<Station, string> = {
  sprint: 'Sekunden, je 2 Versuche. Top-Speed aus 20 bis 30 m.',
  agility: 'Agility 5-0-5 in Sekunden, je 2 Versuche.',
  broad_jump: 'Weitsprung in cm, je 2 Versuche.',
  evaluation: 'Spieler antippen, bewerten, dann „Speichern“.',
}

// Stays at the top while scrolling: the station tabs with progress, the shirt-number search, and the column labels
export const StationBar = ({ station, onStation, counts, total, query, onQuery, unsavedEvaluations }: StationBarProps) => (
  <div className="sticky top-16 z-40 -mx-4 space-y-2 border-b bg-background/95 px-4 pb-2 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
    <div role="tablist" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
      {STATIONS.map((s) => (
        <button
          key={s.key}
          type="button"
          role="tab"
          aria-selected={station === s.key}
          onClick={() => onStation(s.key)}
          className={cn(
            'flex min-h-11 min-w-0 flex-col items-center justify-center rounded-md px-1 leading-tight transition-colors',
            station === s.key ? 'bg-background shadow-sm' : 'text-muted-foreground',
          )}
        >
          <span className="max-w-full truncate text-xs font-medium min-[380px]:text-[13px]">{s.label}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{counts[s.key]}/{total}</span>
        </button>
      ))}
    </div>

    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        aria-label="Spieler suchen, Rückennummer oder Name"
        placeholder="Rückennummer oder Name"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="h-11 w-full rounded-md border bg-background pl-9 pr-10 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button type="button" onClick={() => onQuery('')} aria-label="Suche leeren" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>

    {unsavedEvaluations > 0 && (
      <button
        type="button"
        onClick={() => onStation('evaluation')}
        className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-left text-xs font-medium text-amber-900"
      >
        {unsavedEvaluations === 1 ? '1 Bewertung' : `${unsavedEvaluations} Bewertungen`} nicht gespeichert: unter „Bewertung“ öffnen und „Speichern“ drücken
      </button>
    )}

    <p className="text-xs text-muted-foreground">{HINTS[station]}</p>

    {station === 'sprint' && (
      <div className={`${SPRINT_GRID} px-2 text-center text-xs font-medium text-muted-foreground`}>
        <span />
        {SPRINT_SPLITS.map((s) => <span key={s.key}>{s.label}</span>)}
      </div>
    )}
    {(station === 'agility' || station === 'broad_jump') && (
      <div className={`${PAIR_GRID} px-2 text-center text-xs font-medium text-muted-foreground`}>
        <span className="text-left">Spieler</span>
        <span>Versuch 1</span>
        <span>Versuch 2</span>
        <span>Best</span>
      </div>
    )}
  </div>
)
