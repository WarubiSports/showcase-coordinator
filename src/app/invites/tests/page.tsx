'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { SelectionTestCard } from '@/components/invites/selection-test-card'
import { useSelectionTests } from '@/hooks/use-selection-tests'
import { useEvent } from '@/contexts/event-context'

// Pitch-side test entry for the Kader of the current event (the header's event switcher picks it, like /invites):
// sprint splits, agility and broad jump, two attempts each, saved field by field when a field is left
export default function SelectionTestsPage() {
  const { currentEvent } = useEvent()
  const { players, isLoading, error, migrationPending, refetch, saveScore } = useSelectionTests(currentEvent?.id)

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 pb-24">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Tests</h1>
            <p className="text-sm text-muted-foreground">
              {currentEvent ? `${currentEvent.name} · je 2 Versuche` : 'Erst ein Event auswählen'}
            </p>
          </div>
          <Button variant="outline" size="icon-lg" className="size-11 shrink-0" onClick={refetch} disabled={isLoading} aria-label="Aktualisieren">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Zeiten in Sekunden, Weitsprung in cm. Komma oder Punkt geht. Gespeichert wird beim Verlassen des Felds.
        </p>

        {migrationPending && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Die Test-Felder sind in der Datenbank noch nicht eingerichtet. Eintragen geht erst nach der Migration{' '}
            <code>20261029000001_selection_tests.sql</code>.
          </div>
        )}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        {isLoading && players.length === 0 ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : players.length === 0 ? (
          !error && <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Noch keine Zusagen für dieses Event.</div>
        ) : (
          <ul className="space-y-3">
            {players.map((p) => (
              <SelectionTestCard key={p.id} player={p} disabled={migrationPending} onSave={saveScore} />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
