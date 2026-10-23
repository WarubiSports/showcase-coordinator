import type { AcceptFormState } from '@/components/invite/invite-types'
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
