// German date helpers for the selection invite pages (player-facing, "du" form)

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

const toLocalDate = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00')
const pad = (n: number) => String(n).padStart(2, '0')

// "Freitag, 30.10."
export const weekdayDayMonth = (iso: string): string => {
  const d = toLocalDate(iso)
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`
}

// "Freitag, 30.10.2026"
export const weekdayDate = (iso: string): string => `${weekdayDayMonth(iso)}${toLocalDate(iso).getFullYear()}`

// "09:00 Uhr" from a Postgres time ("09:00:00")
export const germanTime = (time: string | null | undefined): string | null => (time ? `${time.slice(0, 5)} Uhr` : null)

// ISO date n days before an ISO date
export const daysBefore = (iso: string, n: number): string => {
  const d = toLocalDate(iso)
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? ''
