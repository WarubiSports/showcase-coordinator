'use client'

import { ENGLISH_LEVELS, INPUT_CLASS, LABEL_CLASS, POSITIONS, SCHOOL_TYPES, type AcceptFormState } from '@/components/invite/invite-types'
import type { SignedField } from '@/components/invite/signed-fields'
import type { PlayerPosition, SchoolType } from '@/types'

interface SignedMissingFieldsProps {
  form: AcceptFormState
  missing: SignedField[]
  onChange: (patch: Partial<AcceptFormState>) => void
}

// Only the mandatory fields the Base profile could not fill, in the order of the full form
export const SignedMissingFields = ({ form, missing, onChange }: SignedMissingFieldsProps) => {
  const has = (f: SignedField) => missing.includes(f)
  const parent = has('parent_name') || has('parent_phone')
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-ausa-display text-lg font-semibold text-ausa-ink-900">Das fehlt uns noch</h2>
        <p className="mt-1 text-sm text-ausa-ink-500">Felder mit * brauchen wir für die Anmeldung.</p>
      </div>
      {has('birth_year') && (
        <div>
          <label className={LABEL_CLASS} htmlFor="birth_year">Geburtsjahr *</label>
          <input id="birth_year" type="number" inputMode="numeric" required min={1990} max={2015} value={form.birth_year} onChange={(e) => onChange({ birth_year: e.target.value, is_adult: '' })} className={INPUT_CLASS} placeholder="2008" />
        </div>
      )}
      {has('is_adult') && (
        <fieldset className="rounded-xl border border-ausa-ink-200 bg-ausa-paper p-3">
          <legend className="px-1 text-sm font-medium text-ausa-ink-700">Bist du am Spieltag schon 18? *</legend>
          <div className="flex gap-4 pt-1">
            {(['ja', 'nein'] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-base">
                <input type="radio" name="is_adult" value={v} checked={form.is_adult === v} onChange={() => onChange({ is_adult: v })} className="h-5 w-5 accent-ausa-ink-900" />
                {v === 'ja' ? 'Ja' : 'Nein'}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {has('position') && (
        <div>
          <label className={LABEL_CLASS} htmlFor="position">Position *</label>
          <select id="position" required value={form.position} onChange={(e) => onChange({ position: e.target.value as PlayerPosition | '' })} className={INPUT_CLASS}>
            <option value="">Bitte wählen</option>
            {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label} ({p.value})</option>)}
          </select>
        </div>
      )}
      {(has('school_type') || has('grad_year')) && (
        <div className="grid grid-cols-2 gap-3">
          {has('school_type') && (
            <div>
              <label className={LABEL_CLASS} htmlFor="school_type">Schulabschluss *</label>
              <select id="school_type" required value={form.school_type} onChange={(e) => onChange({ school_type: e.target.value as SchoolType | '' })} className={INPUT_CLASS}>
                <option value="">Bitte wählen</option>
                {SCHOOL_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
          {has('grad_year') && (
            <div>
              <label className={LABEL_CLASS} htmlFor="grad_year">Abschlussjahr *</label>
              <input id="grad_year" type="number" inputMode="numeric" required min={2020} max={2035} value={form.grad_year} onChange={(e) => onChange({ grad_year: e.target.value })} className={INPUT_CLASS} placeholder="2027" />
            </div>
          )}
        </div>
      )}
      {has('grades') && (
        <div className={form.english_level ? '' : 'grid grid-cols-2 gap-3'}>
          <div>
            <label className={LABEL_CLASS} htmlFor="grades">Notenschnitt (ungefähr) *</label>
            <input id="grades" type="text" required value={form.grades} onChange={(e) => onChange({ grades: e.target.value })} className={INPUT_CLASS} placeholder="2,3" />
          </div>
          {!form.english_level && (
            <div>
              <label className={LABEL_CLASS} htmlFor="english_level">Englisch</label>
              <select id="english_level" value={form.english_level} onChange={(e) => onChange({ english_level: e.target.value })} className={INPUT_CLASS}>
                <option value="">Bitte wählen</option>
                {ENGLISH_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      {has('phone') && (
        <div>
          <label className={LABEL_CLASS} htmlFor="phone">Handynummer *</label>
          <input id="phone" type="tel" required value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} className={INPUT_CLASS} />
        </div>
      )}
      {parent && (
        <div className="space-y-3 rounded-xl border border-ausa-ink-200 bg-ausa-paper p-3">
          <p className="text-sm font-medium text-ausa-ink-900">Du bist unter 18, deshalb brauchen wir ein Elternteil.</p>
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
  )
}
