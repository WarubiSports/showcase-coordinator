'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { SelectionPlayerCard } from '@/components/invites/selection-player-card'
import { useSelectionTests } from '@/hooks/use-selection-tests'
import { useEvaluations } from '@/hooks/use-evaluations'
import { useEvent } from '@/contexts/event-context'

// Pitch-side page for the Kader of the current event (the header's event switcher picks it, like /invites). Per
// player: Tests (sprint splits, agility, broad jump, two attempts each, saved when a field is left) and Bewertung
// (each staff member's own evaluation, saved with "Speichern"; colleagues' evaluations read-only).
export default function SelectionTestsPage() {
  const { currentEvent } = useEvent()
  const { players, isLoading, error, migrationPending, refetch, saveScore } = useSelectionTests(currentEvent?.id)
  const evaluations = useEvaluations(currentEvent?.id)
  const refresh = () => {
    refetch()
    evaluations.refetch()
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 pb-24">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Tests</h1>
            <p className="text-sm text-muted-foreground">
              {currentEvent ? `${currentEvent.name} · Tests und Bewertung` : 'Erst ein Event auswählen'}
            </p>
          </div>
          <Button variant="outline" size="icon-lg" className="size-11 shrink-0" onClick={refresh} disabled={isLoading} aria-label="Aktualisieren">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tests: je 2 Versuche, Zeiten in Sekunden, Weitsprung in cm, Komma oder Punkt geht, gespeichert wird beim
          Verlassen des Felds. Bewertung: mit „Speichern“.
        </p>

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
          <ul className="space-y-3">
            {players.map((p) => (
              <SelectionPlayerCard
                key={p.id}
                player={p}
                testsDisabled={migrationPending}
                onSaveScore={saveScore}
                scout={evaluations.scout}
                evaluations={evaluations.entries.filter((e) => e.playerId === p.id)}
                onSaveEvaluation={evaluations.saveEvaluation}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
