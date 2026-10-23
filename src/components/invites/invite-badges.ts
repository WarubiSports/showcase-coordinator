import type { InviteCategory, InviteStatus, SchoolType } from '@/types'

// Badge texts and colours of the staff invite row
export const STATUS: Record<InviteStatus, { label: string; cls: string }> = {
  accepted: { label: 'Zugesagt', cls: 'bg-green-500/15 text-green-700 border-green-500/30' },
  invited: { label: 'Keine Antwort', cls: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
  declined: { label: 'Abgesagt', cls: 'bg-gray-500/15 text-gray-600 border-gray-500/30' },
}

export const CATEGORY: Record<InviteCategory, { label: string; cls: string }> = {
  signed: { label: 'Signed', cls: 'bg-purple-500/15 text-purple-700 border-purple-500/30' },
  new: { label: 'Neu', cls: 'bg-gray-500/10 text-gray-600 border-gray-400/30' },
}

export const SCHOOL: Record<SchoolType, string> = { abitur: 'Abitur', fachabitur: 'Fachabitur', realschule: 'Realschule', other: 'Anderer' }
