import { daysBefore, firstName, weekdayDayMonth } from '@/lib/german-date'

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
