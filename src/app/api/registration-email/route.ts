import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { playerName, playerEmail, parentEmail, eventName, eventDate, eventLocation, eventTime, price, currency } = body

  const currencySymbol = currency === 'EUR' ? '€' : '$'
  const priceInfo = price ? `<p style="font-size:18px;font-weight:bold;color:#3B82F6;margin:16px 0">${currencySymbol}${price} — Payment due before the event</p>` : ''

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h1 style="font-size:24px;margin-bottom:4px">You're registered!</h1>
      <p style="color:#666;margin-top:0">Hi ${playerName}, your spot is confirmed.</p>

      <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin:20px 0">
        <p style="font-weight:bold;font-size:16px;margin:0 0 8px">${eventName}</p>
        <p style="color:#666;margin:4px 0">${eventDate}</p>
        ${eventTime ? `<p style="color:#666;margin:4px 0">${eventTime}</p>` : ''}
        <p style="color:#666;margin:4px 0">${eventLocation}</p>
      </div>

      ${priceInfo}

      <p style="color:#999;font-size:12px;margin-top:32px">
        If you have questions, reply to this email.
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
        subject: `Registration Confirmed — ${eventName}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email send failed:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
