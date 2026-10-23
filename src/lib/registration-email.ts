import { getEventOverride, priceLine } from '@/lib/event-overrides'

// Confirmation email after a registration (Resend). Shared by the public /api/registration-email route
// and the selection invite accept route, which sends it only when the player gave an email.

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface RegistrationEmailInput {
  eventSlug?: string | null
  playerName?: string | null
  playerEmail: string
  parentEmail?: string | null
  eventName?: string | null
  eventDate?: string | null
  eventLocation?: string | null
  eventTime?: string | null
  price?: number | string | null
  currency?: string | null
}

export type RegistrationEmailResult = { ok: true } | { ok: false; status: number; error: string }

export const sendRegistrationEmail = async (input: RegistrationEmailInput): Promise<RegistrationEmailResult> => {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return { ok: false, status: 500, error: 'Email not configured' }

  const { eventSlug, playerName, playerEmail, parentEmail, eventName, eventDate, eventLocation, eventTime, price, currency } = input
  const extras = getEventOverride(typeof eventSlug === 'string' ? eventSlug : '')

  const safePlayerName = escapeHtml(playerName || '')
  const safeEventName = escapeHtml(eventName || '')
  const safeEventDate = escapeHtml(eventDate || '')
  const safeEventLocation = escapeHtml(eventLocation || '')
  const safeEventTime = escapeHtml(eventTime || '')

  const payment = extras.payment
  const priceText = price ? escapeHtml(priceLine(Number(price), currency || 'USD', extras)) : ''
  const payText = payment
    ? `Pay via <a href="${escapeHtml(payment.url)}" style="color:#3B82F6">${escapeHtml(payment.label)}</a> before the event.`
    : 'Payment due before the event.'
  const priceInfo = price ? `<p style="font-size:16px;font-weight:bold;margin:16px 0 4px">Entry fee: ${priceText}</p><p style="margin:0 0 16px;color:#444">${payText}</p>` : ''
  const contact = extras.contact
  const contactInfo = contact
    ? `Questions? Reply to this email or contact ${escapeHtml(contact.name)}, ${escapeHtml(contact.role)}: ${escapeHtml(contact.email)}${contact.phone ? `, ${escapeHtml(contact.phone)}` : ''}`
    : 'If you have questions, reply to this email.'

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h1 style="font-size:24px;margin-bottom:4px">You're registered!</h1>
      <p style="color:#666;margin-top:0">Hi ${safePlayerName}, your spot is confirmed.</p>

      <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin:20px 0">
        <p style="font-weight:bold;font-size:16px;margin:0 0 8px">${safeEventName}</p>
        <p style="color:#666;margin:4px 0">${safeEventDate}</p>
        ${safeEventTime ? `<p style="color:#666;margin:4px 0">${safeEventTime}</p>` : ''}
        <p style="color:#666;margin:4px 0">${safeEventLocation}</p>
      </div>

      ${priceInfo}

      <p style="color:#999;font-size:12px;margin-top:32px">
        ${contactInfo}
      </p>
    </div>
  `

  const recipients = [playerEmail]
  if (parentEmail) recipients.push(parentEmail)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Warubi Sports <noreply@warubi-sports.com>',
        to: recipients,
        subject: `Registration Confirmed: ${eventName}`,
        html,
        ...(contact ? { reply_to: contact.email } : {}),
      }),
    })

    if (!res.ok) {
      console.error('Resend error:', await res.text())
      return { ok: false, status: 500, error: 'Failed to send email' }
    }
    return { ok: true }
  } catch (err) {
    console.error('Email send failed:', err)
    return { ok: false, status: 500, error: 'Failed to send email' }
  }
}
