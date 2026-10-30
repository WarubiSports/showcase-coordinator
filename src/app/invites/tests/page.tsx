'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { StationBar } from '@/components/invites/station-bar'
import { PairRow, SprintRow } from '@/components/invites/station-rows'
import { EvaluationRow } from '@/components/invites/evaluation-row'
import { useSelectionTests } from '@/hooks/use-selection-tests'
import { useEvaluations } from '@/hooks/use-evaluations'
import { useEvent } from '@/contexts/event-context'
import { hasStationValue, isStation, matchesSearch, type Station } from '@/lib/test-stations'

const STATION_KEY = 'selection-tests-station'
const subscribeNothing = () => () => {}

// Pitch-side page for the Kader of the current event (the header's event switcher picks it, like /invites), by
// station: Sprint, Agility, Weitsprung (two attempts each, saved when a field is left) and Bewertung (each staff
// member's own evaluation, saved with "Speichern"; colleagues' evaluations read-only). Every station stays mounted
// and is only hidden, so switching station or searching never loses what is typed but not yet saved.
export default function SelectionTestsPage() {
  const { currentEvent } = useEvent()
  const { players, isLoading, error, migrationPending, refetch, saveScore } = useSelectionTests(currentEvent?.id)
  const evaluations = useEvaluations(currentEvent?.id)
  const [picked, setPicked] = useState<Station | null>(null)
  const [query, setQuery] = useState('')
  const [openEvaluation, setOpenEvaluation] = useState<string | null>(null)
  const [unsaved, setUnsaved] = useState<Record<string, boolean>>({})
  const markUnsaved = useCallback((playerId: string, value: boolean) => {
    setUnsaved((prev) => (!!prev[playerId] === value ? prev : { ...prev, [playerId]: value }))
  }, [])

  // Each phone remembers its station, so a reload keeps the tester where they stand
  const stored = useSyncExternalStore(subscribeNothing, () => localStorage.getItem(STATION_KEY), () => null)
  const station: Station = picked ?? (isStation(stored) ? stored : 'sprint')
  const pickStation = (s: Station) => {
    setPicked(s)
    localStorage.setItem(STATION_KEY, s)
  }

  const refresh = () => {
    refetch()
    evaluations.refetch()
  }

  const { scout } = evaluations
  const entriesOf = (id: string) => evaluations.entries.filter((e) => e.playerId === id)
  const counts: Record<Station, number> = {
    sprint: players.filter((p) => hasStationValue(p, 'sprint')).length,
    agility: players.filter((p) => hasStationValue(p, 'agility')).length,
    broad_jump: players.filter((p) => hasStationValue(p, 'broad_jump')).length,
    evaluation: players.filter((p) => entriesOf(p.id).some((e) => (scout ? e.scout === scout : true))).length,
  }
  const visible = players.filter((p) => matchesSearch(p, query))
  const unsavedCount = players.filter((p) => unsaved[p.id]).length

  // A reload or closing the tab with an unsaved evaluation asks first (where the browser supports it)
  useEffect(() => {
    if (unsavedCount === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsavedCount])

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-3 pb-24">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Tests</h1>
            <p className="truncate text-sm text-muted-foreground">
              {currentEvent ? currentEvent.name : 'Erst ein Event auswählen'}
            </p>
          </div>
          <Button variant="outline" size="icon-lg" className="size-11 shrink-0" onClick={refresh} disabled={isLoading} aria-label="Aktualisieren">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {migrationPending && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Die Test-Felder sind in der Datenbank noch nicht eingerichtet. Testwerte eintragen geht erst nach der Migration{' '}
            <code>20261029000001_selection_tests.sql</code>. Bewertungen gehen schon.
          </div>
        )}
        {[error, evaluations.error].filter(Boolean).map((e) => (
          <div key={e} className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{e}</div>
        ))}

        {isLoading && players.length === 0 ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : players.length === 0 ? (
          !error && <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Noch keine Zusagen für dieses Event.</div>
        ) : (
          <>
            <StationBar
              station={station}
              onStation={pickStation}
              counts={counts}
              total={players.length}
              query={query}
              onQuery={setQuery}
              unsavedEvaluations={unsavedCount}
            />
            {visible.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Kein Spieler zu „{query.trim()}“.</p>
            )}
            <ul className="space-y-2">
              {players.map((p) => (
                <li key={p.id} hidden={!visible.includes(p)}>
                  <div hidden={station !== 'sprint'}>
                    <SprintRow player={p} disabled={migrationPending} onSave={saveScore} />
                  </div>
                  <div hidden={station !== 'agility'}>
                    <PairRow test="agility" player={p} disabled={migrationPending} onSave={saveScore} />
                  </div>
                  <div hidden={station !== 'broad_jump'}>
                    <PairRow test="broad_jump" player={p} disabled={migrationPending} onSave={saveScore} />
                  </div>
                  <div hidden={station !== 'evaluation'}>
                    <EvaluationRow
                      player={p}
                      scout={scout}
                      entries={entriesOf(p.id)}
                      open={openEvaluation === p.id}
                      onToggle={() => setOpenEvaluation((id) => (id === p.id ? null : p.id))}
                      onSave={evaluations.saveEvaluation}
                      onUnsavedChange={markUnsaved}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  )
}
