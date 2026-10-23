import { daysBefore, firstName, weekdayDate, weekdayDayMonth } from '@/lib/german-date'

export interface InviteMessageEvent {
  start_date: string
  registration_deadline: string | null
}

// Reply-by date: the event's registration deadline, else four days before the game
export const replyByDate = (event: InviteMessageEvent): string =>
  event.registration_deadline ? event.registration_deadline.slice(0, 10) : daysBefore(event.start_date, 4)

export const inviteLink = (origin: string, token: string): string => `${origin}/invite/${token}`

interface MessageInput {
  name: string
  personalLine: string | null
  sender: string
  link: string
  event: InviteMessageEvent
}

// WhatsApp invitation, template agreed with Max on 22.10.2026. Only the slots change:
// {Vorname} {persönlicher Satz} {Datum} {Link} {Antwort bis} {Absender}
export const buildWhatsAppMessage = ({ name, personalLine, sender, link, event }: MessageInput): string =>
  [
    `Hi ${firstName(name)},`,
    personalLine?.trim() || null,
    `Am ${weekdayDayMonth(event.start_date)}, spielt die Athletes USA Selection gegen das 1. FC Köln International Talent Program (ITP). ` +
      'Das komplette Spiel wird mit Veo aufgenommen, danach bekommst du deine eigenen Szenen. ' +
      `Hier sind die Eckdaten und deine Zusage, dauert zwei Minuten: ${link}. ` +
      `Sag mir bitte bis ${weekdayDayMonth(replyByDate(event))}, Bescheid. ${sender}, Athletes USA`,
  ]
    .filter(Boolean)
    .join(' ')

// wa.me link with the message prefilled; German numbers without country code get +49
export const whatsAppUrl = (phone: string | null, text: string): string | null => {
  if (!phone) return null
  let digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('0')) digits = '49' + digits.slice(1)
  if (digits.length < 8) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

// Coach bundle: one German message for a club coach who forwards the personal links (Max, 23.10)
export interface CoachMessageEvent extends InviteMessageEvent {
  start_time: string | null
  location: string
  description: string | null
}

// "Treffpunkt 10:30 Uhr an der LöWi Arena" from the event description, if there is such a line
export const treffpunktLine = (description: string | null | undefined): string | null =>
  description?.match(/Treffpunkt[^.,\n]*/)?.[0]?.trim() ?? null

interface CoachMessageInput {
  coach: string | null
  sender: string
  event: CoachMessageEvent
  players: { name: string; link: string }[]
}

export const buildCoachMessage = ({ coach, sender, event, players }: CoachMessageInput): string => {
  const kickoff = event.start_time ? event.start_time.slice(0, 5) : null
  const treff = treffpunktLine(event.description)
  const head =
    `Hi${coach?.trim() ? ` ${coach.trim()}` : ''}, wie besprochen die Einladungen zum Auswahlspiel Athletes USA Selection gegen das 1. FC Köln ITP ` +
    `am ${weekdayDate(event.start_date)}${kickoff ? `, ${kickoff} Uhr` : ''}, ${event.location}.${treff ? ` ${treff}.` : ''} ` +
    'Jeder Spieler hat seinen eigenen Link, bitte einfach weiterleiten:'
  const tail = `Zusage bis ${weekdayDayMonth(replyByDate(event))} direkt über den Link. Danke dir! ${sender}, Athletes USA`
  return [head, '', ...players.map((p) => `${p.name}: ${p.link}`), '', tail].join('\n')
}
