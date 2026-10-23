'use client'

import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { CONSENT_SUBMIT_NOTE } from '@/lib/consent-text'
import { ConsentBlock } from '@/components/invite/consent-block'
import { SignedMissingFields } from '@/components/invite/signed-missing-fields'
import { isMinorForm, missingSignedFields } from '@/components/invite/signed-fields'
import { POSITIONS, SCHOOL_TYPES, type AcceptFormState } from '@/components/invite/invite-types'

interface SignedConfirmProps {
  form: AcceptFormState
  eventYear: number
  isSubmitting: boolean
  error: string | null
  onChange: (patch: Partial<AcceptFormState>) => void
  onSubmit: () => void
  onEdit: () => void
  onBack: () => void
}

// Accept step for a player already signed with Athletes USA and linked in Base: what we know is shown to
// confirm, only what Base could not fill is asked, the consent block stays. "Stimmt so" sends the same
// form the full form sends, so the server validates and writes exactly as for everyone.
export const SignedConfirm = ({ form, eventYear, isSubmitting, error, onChange, onSubmit, onEdit, onBack }: SignedConfirmProps) => {
  const missing = missingSignedFields(form, eventYear)
  const minor = isMinorForm(form, eventYear)
  const rows: [string, string][] = [
    ['Name', form.name],
    ['Geburtsjahr', form.birth_year],
    ['Position', POSITIONS.find((p) => p.value === form.position)?.label ?? ''],
    ['Verein', form.club],
    ['Schulabschluss', [SCHOOL_TYPES.find((s) => s.value === form.school_type)?.label, form.grad_year.trim()].filter(Boolean).join(', ')],
    ['Notenschnitt', form.grades],
    ['Englisch', form.english_level],
    ['Handynummer', form.phone],
    ...(minor ? [['Elternteil', [form.parent_name, form.parent_phone].filter((v) => v.trim()).join(', ')] as [string, string]] : []),
  ]
  const known = rows.filter(([, v]) => v.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="font-ausa-display text-2xl font-semibold text-ausa-ink-900">Deine Daten</h1>
        <p className="mt-1 text-sm text-ausa-ink-500">Das wissen wir schon aus deinem Athletes USA Profil. Stimmt es noch?</p>
      </div>

      <div className="rounded-xl border border-ausa-ink-200 bg-ausa-paper p-4">
        <dl className="divide-y divide-ausa-ink-100">
          {known.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2 text-sm">
              <dt className="text-ausa-ink-400">{label}</dt>
              <dd className="text-right font-medium text-ausa-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onEdit} className="mt-2 text-sm font-medium text-ausa-ink-700 underline">Ändern</button>
      </div>

      {missing.length > 0 && <SignedMissingFields form={form} missing={missing} onChange={onChange} />}

      <ConsentBlock form={form} minor={minor} onChange={onChange} />

      {error && <p className="rounded-xl bg-ausa-accent-soft px-4 py-3 text-sm text-ausa-accent-ink">{error}</p>}

      <div className="space-y-3">
        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-ausa-accent py-4 text-lg font-bold text-white hover:bg-ausa-accent-hover disabled:opacity-50">
          {isSubmitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Wird gesendet...</span> : 'Stimmt so'}
        </button>
        <p className="text-center text-xs text-ausa-ink-400">{CONSENT_SUBMIT_NOTE}</p>
        <button type="button" onClick={onBack} className="w-full py-2 text-sm font-medium text-ausa-ink-500 underline">Zurück</button>
      </div>
    </form>
  )
}
