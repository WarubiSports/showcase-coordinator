'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildCoachMessage, type CoachMessageEvent } from '@/lib/invite-message'

interface CoachBundleBarProps {
  players: { name: string; link: string }[]
  event: CoachMessageEvent | null
  sender: string
  onClear: () => void
}

// Ticked rows become one German message for a club coach who forwards the personal links
export const CoachBundleBar = ({ players, event, sender, onClear }: CoachBundleBarProps) => {
  const [coach, setCoach] = useState('')
  const [preview, setPreview] = useState(false)
  const message = event ? buildCoachMessage({ coach: coach.trim() || null, sender: sender || 'Athletes USA', event, players }) : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      toast.success(`Coach-Nachricht kopiert (${players.length} Spieler)`)
    } catch {
      toast.error('Kopieren hat nicht geklappt')
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-sm font-medium">
          {players.length} Spieler für einen Coach ausgewählt
        </p>
        <Input value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="Vorname des Coaches (optional)" className="sm:ml-auto sm:w-56" />
        <Button onClick={copy} disabled={!event || players.length === 0}><Copy className="h-4 w-4" />Für Coach kopieren</Button>
        <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)}>
          {preview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {preview ? 'Text ausblenden' : 'Text anzeigen'}
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear} aria-label="Auswahl aufheben"><X className="h-4 w-4" /></Button>
      </div>
      {preview && <pre className="whitespace-pre-wrap rounded-md border bg-card p-3 text-sm">{message}</pre>}
    </div>
  )
}
