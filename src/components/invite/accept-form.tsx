'use client'

import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { needsAdultQuestion, isMinorAtEvent } from '@/lib/invite-accept'
import { CONSENT_SUBMIT_NOTE } from '@/lib/consent-text'
import { ConsentBlock } from '@/components/invite/consent-block'
import { ENGLISH_LEVELS, INPUT_CLASS, LABEL_CLASS, POSITIONS, SCHOOL_TYPES, type AcceptFormState } from '@/components/invite/invite-types'
import type { PlayerPosition, SchoolType } from '@/types'

interface AcceptFormProps {
  form: AcceptFormState
  eventYear: number
  isSubmitting: boolean
  error: string | null
  onChange: (patch: Partial<AcceptFormState>) => void
  onSubmit: () => void
  onBack: () => void
}

export const AcceptForm = ({ form, eventYear, isSubmitting, error, onChange, onSubmit, onBack }: AcceptFormProps) => {
  const birthYear = parseInt(form.birth_year, 10)
  const hasYear = Number.isInteger(birthYear) && birthYear >= 1990 && birthYear <= 2015
  const askAdult = hasYear && needsAdultQuestion(birthYear, eventYear)
  const minor = hasYear && isMinorAtEvent(birthYear, form.is_adult === 'ja' ? true : form.is_adult === 'nein' ? false : null, eventYear)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Kurz deine Angaben</h1>
        <p className="mt-1 text-sm text-gray-600">Felder mit * brauchen wir, der Rest hilft beim Zuordnen deiner Szenen.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="name">Vor- und Nachname *</label>
          <input id="name" type="text" required value={form.name} onChange={(e) => onChange({ name: e.target.value })} className={INPUT_CLASS} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="birth_year">Geburtsjahr *</label>
            <input id="birth_year" type="number" inputMode="numeric" required min={1990} max={2015} value={form.birth_year} onChange={(e) => onChange({ birth_year: e.target.value, is_adult: '' })} className={INPUT_CLASS} placeholder="2008" />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="position">Position</label>
            <select id="position" value={form.position} onChange={(e) => onChange({ position: e.target.value as PlayerPosition | '' })} className={INPUT_CLASS}>
              <option value="">Bitte wählen</option>
              {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label} ({p.value})</option>)}
            </select>
          </div>
        </div>
        {askAdult && (
          <fieldset className="rounded-xl border border-gray-200 bg-white p-3">
            <legend className="px-1 text-sm font-medium text-gray-700">Bist du am Spieltag schon 18? *</legend>
            <div className="flex gap-4 pt-1">
              {(['ja', 'nein'] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 text-base">
                  <input type="radio" name="is_adult" value={v} checked={form.is_adult === v} onChange={() => onChange({ is_adult: v })} className="h-5 w-5 accent-emerald-600" />
                  {v === 'ja' ? 'Ja' : 'Nein'}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <label className={LABEL_CLASS} htmlFor="club">Verein</label>
          <input id="club" type="text" value={form.club} onChange={(e) => onChange({ club: e.target.value })} className={INPUT_CLASS} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="school_type">Schulabschluss</label>
            <select id="school_type" value={form.school_type} onChange={(e) => onChange({ school_type: e.target.value as SchoolType | '' })} className={INPUT_CLASS}>
              <option value="">Bitte wählen</option>
              {SCHOOL_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="grad_year">Abschlussjahr</label>
            <input id="grad_year" type="number" inputMode="numeric" min={2020} max={2035} value={form.grad_year} onChange={(e) => onChange({ grad_year: e.target.value })} className={INPUT_CLASS} placeholder="2027" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="grades">Notenschnitt (ungefähr)</label>
            <input id="grades" type="text" value={form.grades} onChange={(e) => onChange({ grades: e.target.value })} className={INPUT_CLASS} placeholder="2,3" />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="english_level">Englisch</label>
            <select id="english_level" value={form.english_level} onChange={(e) => onChange({ english_level: e.target.value })} className={INPUT_CLASS}>
              <option value="">Bitte wählen</option>
              {ENGLISH_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="video_url">Video-Link (falls vorhanden)</label>
          <input id="video_url" type="url" inputMode="url" value={form.video_url} onChange={(e) => onChange({ video_url: e.target.value })} className={INPUT_CLASS} placeholder="https://" />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="phone">Handynummer *</label>
          <input id="phone" type="tel" required value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} className={INPUT_CLASS} />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="email">E-Mail (optional)</label>
          <input id="email" type="email" value={form.email} onChange={(e) => onChange({ email: e.target.value })} className={INPUT_CLASS} />
        </div>
        {minor && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-sm font-medium text-gray-950">Du bist unter 18, deshalb brauchen wir ein Elternteil.</p>
            <div>
              <label className={LABEL_CLASS} htmlFor="parent_name">Name Elternteil *</label>
              <input id="parent_name" type="text" required value={form.parent_name} onChange={(e) => onChange({ parent_name: e.target.value })} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="parent_phone">Handynummer Elternteil *</label>
              <input id="parent_phone" type="tel" required value={form.parent_phone} onChange={(e) => onChange({ parent_phone: e.target.value })} className={INPUT_CLASS} />
            </div>
          </div>
        )}
      </div>

      <ConsentBlock form={form} minor={minor} onChange={onChange} />

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="space-y-3">
        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:opacity-50">
          {isSubmitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Wird gesendet...</span> : 'Zusage abschicken'}
        </button>
        <p className="text-center text-xs text-gray-500">{CONSENT_SUBMIT_NOTE}</p>
        <button type="button" onClick={onBack} className="w-full py-2 text-sm font-medium text-gray-600 underline">Zurück</button>
      </div>
    </form>
  )
}
