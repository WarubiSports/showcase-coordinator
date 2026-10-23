'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { rosterRows } from '@/components/invites/roster-table'
import { MatchLockup } from '@/components/invite/match-lockup'
import { useInvites } from '@/hooks/use-invites'
import { useEvent } from '@/contexts/event-context'
import { germanTime, weekdayDate } from '@/lib/german-date'

// Print-friendly roster for the Veo camera and the coach: number, name, position
export default function RosterPrintPage() {
  const { currentEvent } = useEvent()
  const { invites, isLoading } = useInvites(currentEvent?.id)
  const rows = rosterRows(invites)

  return (
    <div className="min-h-screen bg-white p-8 text-gray-950 print:p-0">
      <style>{`@media print { .no-print { display: none !important } @page { margin: 14mm } }`}</style>
      <div className="no-print mb-6 flex items-center gap-3 text-sm">
        <button onClick={() => window.print()} className="rounded-md bg-gray-950 px-4 py-2 font-semibold text-white">Drucken</button>
        <Link href="/invites" className="text-gray-600 underline">Zurück zu den Einladungen</Link>
      </div>

      {!currentEvent || isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      ) : (
        <>
          <MatchLockup size="lg" className="mb-4 justify-start" />
          <h1 className="text-2xl font-bold">{currentEvent.name}</h1>
          <p className="mt-1 text-gray-600">
            {[weekdayDate(currentEvent.start_date), germanTime(currentEvent.start_time), currentEvent.location].filter(Boolean).join(' · ')}
          </p>
          <table className="mt-6 w-full border-collapse text-lg">
            <thead>
              <tr className="border-b-2 border-gray-950 text-left text-sm uppercase tracking-wide text-gray-600">
                <th className="w-16 py-2 pr-3">Nr.</th>
                <th className="py-2 pr-3">Name</th>
                <th className="w-24 py-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-gray-300">
                  <td className="py-2 pr-3 text-2xl font-bold tabular-nums">{p.jersey_number ?? ''}</td>
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2">{p.position ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="mt-4 text-gray-500">Noch keine Zusagen.</p>}
          <p className="mt-6 text-xs text-gray-500">
            {rows.length} Spieler · gedruckt am {new Date().toLocaleDateString('de-DE')}
          </p>
        </>
      )}
    </div>
  )
}
