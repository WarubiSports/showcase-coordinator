import { POSITIONS, SCHOOL_TYPES, type AcceptFormState } from '@/components/invite/invite-types'
import { isMinorAtEvent, needsAdultQuestion } from '@/lib/invite-accept'

export type SignedField = 'birth_year' | 'is_adult' | 'position' | 'school_type' | 'grad_year' | 'grades' | 'phone' | 'parent_name' | 'parent_phone'

const hasBirthYear = (form: AcceptFormState): number | null => {
  const year = parseInt(form.birth_year, 10)
  return Number.isInteger(year) && year >= 1990 && year <= 2015 ? year : null
}

export const isMinorForm = (form: AcceptFormState, eventYear: number): boolean => {
  const year = hasBirthYear(form)
  return year !== null && isMinorAtEvent(year, form.is_adult === 'ja' ? true : form.is_adult === 'nein' ? false : null, eventYear)
}

export interface SignedCardRow {
  field: SignedField | 'name' | 'club' | 'english_level' | 'parent'
  label: string
  value: string
}

// What the card shows: one row per known field, type and year as separate rows, the phone as stored.
// A field with a row here is never in missingSignedFields, and the other way round.
export const signedCardRows = (form: AcceptFormState, eventYear: number): SignedCardRow[] => {
  const rows: SignedCardRow[] = [
    { field: 'birth_year', label: 'Geburtsjahr', value: form.birth_year.trim() },
    { field: 'position', label: 'Position', value: POSITIONS.find((p) => p.value === form.position)?.label ?? '' },
    { field: 'club', label: 'Verein', value: form.club.trim() },
    { field: 'school_type', label: 'Schulabschluss', value: SCHOOL_TYPES.find((s) => s.value === form.school_type)?.label ?? '' },
    { field: 'grad_year', label: 'Abschlussjahr', value: form.grad_year.trim() },
    { field: 'grades', label: 'Notenschnitt', value: form.grades.trim() },
    { field: 'english_level', label: 'Englisch', value: form.english_level.trim() },
    { field: 'phone', label: 'Handynummer', value: form.phone.trim() },
  ]
  if (isMinorForm(form, eventYear)) rows.push({ field: 'parent', label: 'Elternteil', value: [form.parent_name.trim(), form.parent_phone.trim()].filter(Boolean).join(', ') })
  return rows.filter((r) => r.value)
}

// The mandatory fields of the accept form that the Base profile could not fill. A signed player is asked
// these and nothing else; the server validates the whole form exactly as for everyone.
export const missingSignedFields = (form: AcceptFormState, eventYear: number): SignedField[] => {
  const out: SignedField[] = []
  const year = hasBirthYear(form)
  if (year === null) out.push('birth_year')
  if (year !== null && needsAdultQuestion(year, eventYear) && !form.is_adult) out.push('is_adult')
  if (!form.position) out.push('position')
  if (!form.school_type) out.push('school_type')
  if (!form.grad_year.trim()) out.push('grad_year')
  if (!form.grades.trim()) out.push('grades')
  if (!form.phone.trim()) out.push('phone')
  if (isMinorForm(form, eventYear)) {
    if (!form.parent_name.trim()) out.push('parent_name')
    if (!form.parent_phone.trim()) out.push('parent_phone')
  }
  return out
}

interface ConfirmInput {
  invite: { status: string }
  base: { prefill: { name: string | null; birth_year: number | null; position: string | null; phone: string | null } } | null
}

// The confirm card instead of the full form: a Base-linked invite still open whose Base record covers what the
// card does not ask under it (name, birth year, position, phone). Any category: a Neu player after the portal
// intake knows these too (Max, 26.10). On a phone mismatch Base's PII fields are withheld (PR #4), so the
// check fails and the full form opens, prefilled as before.
export const usesConfirmCard = (data: ConfirmInput): boolean => {
  const p = data.base?.prefill
  return data.invite.status === 'invited' && !!p && !!(p.name && p.birth_year && p.position && p.phone)
}
