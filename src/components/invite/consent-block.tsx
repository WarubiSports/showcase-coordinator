'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  CONSENT_CONTROLLER,
  CONSENT_NAME_HINT_ADULT,
  CONSENT_NAME_HINT_MINOR,
  CONSENT_NAME_LABEL,
  CONSENT_ORGANIZER,
  CONSENT_PARENT_TEXT,
  CONSENT_PROFILE_HINT,
  CONSENT_PROFILE_LABEL,
  CONSENT_PROFILE_TEXT,
  CONSENT_SECTIONS,
  CONSENT_SOCIAL_HINT,
  CONSENT_SOCIAL_LABEL,
  CONSENT_SOCIAL_TEXT,
} from '@/lib/consent-text'
import { INPUT_CLASS, LABEL_CLASS, type AcceptFormState } from '@/components/invite/invite-types'

interface ConsentBlockProps {
  form: AcceptFormState
  minor: boolean
  onChange: (patch: Partial<AcceptFormState>) => void
}

const Tick = ({
  checked,
  onChange,
  label,
  hint,
  text,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  text: string
}) => (
  <label className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-600" />
    <span className="text-sm">
      <span className="font-semibold text-gray-950">{label}</span>
      {hint && <span className="text-gray-500"> ({hint})</span>}
      <span className="mt-1 block text-gray-700">{text}</span>
    </span>
  </label>
)

export const ConsentBlock = ({ form, minor, onChange }: ConsentBlockProps) => {
  const [showFull, setShowFull] = useState(false)
  // One tap sets every applicable box; nothing is pre-ticked, the tap is the active act (Max, 23.10)
  const allTicked = form.consent_profile && form.consent_social && (!minor || form.consent_parent)
  const acceptAll = () => onChange({ consent_profile: true, consent_social: true, ...(minor ? { consent_parent: true } : {}) })

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-950">Einverständnis</h2>
      <p className="text-sm text-gray-700">
        Kurz zusammengefasst: Du spielst auf eigene Verantwortung, das Spiel wird gefilmt, und du entscheidest, wofür wir die Aufnahmen nutzen dürfen.
      </p>
      <button type="button" onClick={() => setShowFull(!showFull)} className="flex items-center gap-1 text-sm font-semibold text-gray-950 underline">
        {showFull ? 'Erklärung einklappen' : 'Vollständige Erklärung lesen'}
        {showFull ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showFull && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <p className="text-xs text-gray-500">{CONSENT_ORGANIZER}<br />{CONSENT_CONTROLLER}</p>
          {CONSENT_SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="font-semibold text-gray-950">{s.title}</h3>
              {s.paragraphs.map((p, i) => <p key={i} className="mt-1">{p}</p>)}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={acceptAll}
        disabled={allTicked}
        className="w-full rounded-xl border-2 border-emerald-600 bg-white py-3 font-semibold text-emerald-700 active:scale-[0.98] disabled:border-gray-200 disabled:text-gray-500"
      >
        {allTicked ? 'Alles akzeptiert' : 'Alles akzeptieren'}
      </button>
      <p className="px-1 text-xs text-gray-500">Setzt alle Häkchen unten mit einem Tipp. Einzelne kannst du danach wieder abwählen.</p>

      <Tick checked={form.consent_profile} onChange={(v) => onChange({ consent_profile: v })} label={CONSENT_PROFILE_LABEL} hint={CONSENT_PROFILE_HINT} text={CONSENT_PROFILE_TEXT} />
      {!form.consent_profile && (
        <p className="px-1 text-xs text-amber-700">Ohne dieses Häkchen kannst du mitspielen, bekommst aber keine Szenen.</p>
      )}
      <Tick checked={form.consent_social} onChange={(v) => onChange({ consent_social: v })} label={CONSENT_SOCIAL_LABEL} hint={CONSENT_SOCIAL_HINT} text={CONSENT_SOCIAL_TEXT} />
      {minor && (
        <Tick checked={form.consent_parent} onChange={(v) => onChange({ consent_parent: v })} label="Zustimmung Elternteil" hint="nötig unter 18" text={CONSENT_PARENT_TEXT} />
      )}

      <div>
        <label className={LABEL_CLASS} htmlFor="consent_name">{CONSENT_NAME_LABEL} *</label>
        <input
          id="consent_name"
          type="text"
          required
          value={form.consent_name}
          onChange={(e) => onChange({ consent_name: e.target.value })}
          className={INPUT_CLASS}
          placeholder={minor ? CONSENT_NAME_HINT_MINOR : CONSENT_NAME_HINT_ADULT}
        />
      </div>
    </section>
  )
}
