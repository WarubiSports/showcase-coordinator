'use client'

import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { CONSENT_SUBMIT_NOTE } from '@/lib/consent-text'
import { ConsentBlock } from '@/components/invite/consent-block'
import { SignedMissingFields } from '@/components/invite/signed-missing-fields'
import { isMinorForm, missingSignedFields, signedCardRows } from '@/components/invite/signed-fields'
import type { AcceptFormState } from '@/components/invite/invite-types'

interface SignedConfirmProps {
  form: AcceptFormState
  photo: string | null
  eventYear: number
  isSubmitting: boolean
  error: string | null
  onChange: (patch: Partial<AcceptFormState>) => void
  onSubmit: () => void
  onEdit: () => void
  onBack: () => void
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

// Accept step for a player already signed with Athletes USA and linked in Base: one card with what we know,
// what Base could not fill asked inside the same card, then the consent block. "Zusagen" sends the same
// form the full form sends, so the server validates and writes exactly as for everyone.
export const SignedConfirm = ({ form, photo, eventYear, isSubmitting, error, onChange, onSubmit, onEdit, onBack }: SignedConfirmProps) => {
  const missing = missingSignedFields(form, eventYear)
  const minor = isMinorForm(form, eventYear)
  const rows = signedCardRows(form, eventYear)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="font-ausa-display text-2xl font-semibold text-ausa-ink-900">Deine Daten</h1>
        <p className="mt-1 text-ausa-ink-500">Das wissen wir schon aus deinem Athletes USA Profil. Stimmt es noch?</p>
      </div>

      <div className="rounded-xl border border-ausa-ink-200 bg-ausa-paper p-4 shadow-[0_1px_0_rgba(11,15,23,0.04)]">
        <div className="flex items-center gap-3">
          {photo ? (
            // Base and FuPa photos live on external hosts; next/image would need every host allow-listed
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-full bg-ausa-ink-100 object-cover object-top" />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ausa-ink-100 font-ausa-display text-lg font-semibold text-ausa-ink-400">{initials(form.name)}</div>
          )}
          <div className="min-w-0">
            <p className="font-ausa-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ausa-accent">Athletes USA Auswahl</p>
            <p className="truncate font-ausa-display text-xl font-semibold leading-tight text-ausa-ink-900">{form.name}</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.field} className="min-w-0">
              <dt className="text-xs text-ausa-ink-400">{r.label}</dt>
              <dd className="break-words font-medium text-ausa-ink-900">{r.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onEdit} className="rounded-lg border border-ausa-ink-900 px-3 py-1.5 text-sm font-semibold text-ausa-ink-900">Ändern</button>
        </div>

        {missing.length > 0 && (
          <div className="mt-4 border-t border-ausa-ink-200 pt-4">
            <h2 className="font-ausa-display text-lg font-semibold text-ausa-ink-900">Das fehlt uns noch</h2>
            <p className="mb-4 mt-1 text-sm text-ausa-ink-500">Felder mit * brauchen wir für die Anmeldung.</p>
            <SignedMissingFields form={form} missing={missing} onChange={onChange} />
          </div>
        )}
      </div>

      <ConsentBlock form={form} minor={minor} onChange={onChange} />

      {error && <p className="rounded-xl bg-ausa-accent-soft px-4 py-3 text-sm text-ausa-accent-ink">{error}</p>}

      <div className="space-y-3">
        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-ausa-accent py-4 text-lg font-bold text-white hover:bg-ausa-accent-hover disabled:opacity-50">
          {isSubmitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Wird gesendet...</span> : 'Zusagen'}
        </button>
        <p className="text-center text-xs text-ausa-ink-400">{CONSENT_SUBMIT_NOTE}</p>
        <button type="button" onClick={onBack} className="w-full py-2 text-sm font-medium text-ausa-ink-500 underline">Zurück</button>
      </div>
    </form>
  )
}
