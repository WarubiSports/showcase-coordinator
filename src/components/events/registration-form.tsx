import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react'
import { ChevronDown, ChevronUp, Loader2, Users } from 'lucide-react'
import type { PlayerPosition } from '@/types'

export interface RegistrationFormState {
  name: string
  email: string
  phone: string
  birth_year: string
  position: PlayerPosition | ''
  club: string
  country: string
  parent_name: string
  parent_email: string
  parent_phone: string
}

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'GK', label: 'Goalkeeper' },
  { value: 'CB', label: 'Center Back' },
  { value: 'LB', label: 'Left Back' },
  { value: 'RB', label: 'Right Back' },
  { value: 'CDM', label: 'Defensive Mid' },
  { value: 'CM', label: 'Central Mid' },
  { value: 'CAM', label: 'Attacking Mid' },
  { value: 'LW', label: 'Left Wing' },
  { value: 'RW', label: 'Right Wing' },
  { value: 'ST', label: 'Striker' },
]

const STYLES = {
  dark: {
    container: 'rounded-2xl border border-gray-800 bg-gray-900/60 p-6 sm:p-8 animate-fade-up',
    title: 'text-2xl font-black uppercase tracking-tight mb-6',
    label: 'block text-sm font-medium text-gray-300 mb-1.5',
    input:
      'w-full rounded-lg bg-gray-800/80 border border-gray-700 px-3 py-2.5 sm:py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors accent-focus',
    divider: 'pt-4 border-t border-gray-800',
    toggle: 'flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors',
    submit:
      'w-full py-4 rounded-2xl text-white font-black text-base uppercase tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:hover:brightness-100',
  },
  light: {
    container: 'animate-fade-up',
    title: 'text-2xl font-bold text-gray-950 mb-5',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    input:
      'w-full rounded-md bg-white border border-gray-300 px-3 py-2.5 text-base text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent accent-focus',
    divider: 'pt-4 border-t border-gray-200',
    toggle: 'flex items-center gap-2 text-sm text-gray-600 hover:text-gray-950',
    submit: 'w-full py-3.5 rounded-md text-white font-bold text-base disabled:opacity-50',
  },
}

export interface RegistrationFormProps {
  variant: 'dark' | 'light'
  form: RegistrationFormState
  setForm: Dispatch<SetStateAction<RegistrationFormState>>
  onSubmit: (e: FormEvent) => void
  isSubmitting: boolean
  parentExpanded: boolean
  setParentExpanded: (open: boolean) => void
  parentRecommended: boolean
  accentColor: string
  formRef: RefObject<HTMLDivElement | null>
}

export const RegistrationForm = ({
  variant,
  form,
  setForm,
  onSubmit,
  isSubmitting,
  parentExpanded,
  setParentExpanded,
  parentRecommended,
  accentColor,
  formRef,
}: RegistrationFormProps) => {
  const s = STYLES[variant]

  return (
    <div ref={formRef} className={s.container}>
      <h2 className={s.title}>Player Registration</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Player Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={s.label}>Full Name *</label>
            <input
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={s.input}
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className={s.label}>Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={s.input}
              placeholder="player@email.com"
            />
          </div>
          <div>
            <label className={s.label}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={s.input}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label className={s.label}>Birth Year</label>
            <input
              type="number"
              min={2000}
              max={2015}
              value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              className={s.input}
              placeholder="2008"
            />
          </div>
          <div>
            <label className={s.label}>Position</label>
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value as PlayerPosition })}
              className={s.input}
            >
              <option value="">Select position</option>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={s.label}>Club / Team</label>
            <input
              type="text"
              value={form.club}
              onChange={(e) => setForm({ ...form, club: e.target.value })}
              className={s.input}
              placeholder="FC Example"
            />
          </div>
          <div>
            <label className={s.label}>Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className={s.input}
              placeholder="USA"
            />
          </div>
        </div>

        {/* Parent / Guardian */}
        <div className={s.divider}>
          <button type="button" onClick={() => setParentExpanded(!parentExpanded)} className={s.toggle}>
            <Users className="h-4 w-4" />
            Parent / Guardian Info {parentRecommended ? '(recommended)' : '(optional)'}
            {parentExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {parentExpanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up">
              <div className="sm:col-span-2">
                <label className={s.label}>Parent Name</label>
                <input
                  type="text"
                  value={form.parent_name}
                  onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                  className={s.input}
                />
              </div>
              <div>
                <label className={s.label}>Parent Email</label>
                <input
                  type="email"
                  value={form.parent_email}
                  onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                  className={s.input}
                />
              </div>
              <div>
                <label className={s.label}>Parent Phone</label>
                <input
                  type="tel"
                  value={form.parent_phone}
                  onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                  className={s.input}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !form.name || !form.email}
          className={s.submit}
          style={{ backgroundColor: accentColor }}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Registering...
            </span>
          ) : (
            'Complete Registration'
          )}
        </button>
      </form>
    </div>
  )
}
