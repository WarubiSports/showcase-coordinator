'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ChoiceButtons } from '@/components/invites/choice-buttons'
import {
  COLLEGE_FIT, OUTCOMES, RATING_KEYS, RATING_LABELS, TEXT_LIMITS, inputOf, savedAtLabel,
  type EvaluationEntry, type EvaluationInput, type RatingKey,
} from '@/lib/selection-evaluation'

const SCORES = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))

interface EvaluationFormProps {
  scout: string
  own: EvaluationEntry | undefined
  onSave: (note: EvaluationInput, expectedVersion: number) => Promise<void>
}

// The signed-in staff member's own evaluation of one player. Saved with "Speichern"; the parent remounts the
// form (key = version) after a save or a reload, so it always starts from what the server holds.
export const EvaluationForm = ({ scout, own, onSave }: EvaluationFormProps) => {
  const [form, setForm] = useState<EvaluationInput>(() => inputOf(own?.note))
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(inputOf(own?.note))
  const set = <K extends keyof EvaluationInput>(key: K, value: EvaluationInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setRating = (key: RatingKey, value: number | null) => setForm((f) => ({ ...f, ratings: { ...f.ratings, [key]: value } }))

  const save = async () => {
    setSaving(true)
    try {
      await onSave(form, own?.version ?? 0)
      toast.success('Bewertung gespeichert')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Speichern hat nicht geklappt')
    } finally {
      setSaving(false)
    }
  }

  const text = (key: 'positive' | 'developmentPoint' | 'rawVoice', label: string) => (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      <Textarea value={form[key]} maxLength={TEXT_LIMITS[key]} rows={2} onChange={(e) => set(key, e.target.value)} />
    </label>
  )

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Deine Bewertung als <span className="font-medium text-foreground">{scout}</span></p>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Beobachtete Position</span>
        <Input className="h-11" value={form.observedPosition} maxLength={TEXT_LIMITS.observedPosition} onChange={(e) => set('observedPosition', e.target.value)} />
      </label>

      <div className="space-y-2">
        {RATING_KEYS.map((key) => (
          <div key={key} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
            <span className="text-sm font-semibold">{RATING_LABELS[key]}</span>
            <ChoiceButtons label={RATING_LABELS[key]} options={SCORES} value={form.ratings[key]} onChange={(v) => setRating(key, v)} clearable className="grid-cols-5" />
          </div>
        ))}
      </div>

      {text('positive', 'Stärke')}
      {text('developmentPoint', 'Entwicklungspunkt')}
      {text('rawVoice', 'Notizen')}

      <div className="space-y-1">
        <span className="text-sm font-semibold">Einschätzung</span>
        <ChoiceButtons label="Einschätzung" options={OUTCOMES} value={form.manualOutcome} onChange={(v) => v && set('manualOutcome', v)} className="grid-cols-2" />
      </div>

      <div className="space-y-1">
        <span className="text-sm font-semibold">College-Fußball-Niveau</span>
        <ChoiceButtons label="College-Fußball-Niveau" options={COLLEGE_FIT} value={form.footballCollegeFit} onChange={(v) => v !== null && set('footballCollegeFit', v)} className="grid-cols-3" />
      </div>

      <div className="flex items-center gap-3">
        <Button className="h-11 flex-1" onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Speichern
        </Button>
        <span className={`text-xs ${dirty ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}>
          {dirty ? 'Nicht gespeichert' : own ? `Gespeichert ${savedAtLabel(own.updatedAt)}` : 'Noch keine Bewertung'}
        </span>
      </div>
    </div>
  )
}
