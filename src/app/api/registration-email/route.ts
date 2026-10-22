import { NextRequest, NextResponse } from 'next/server'
import { sendRegistrationEmail } from '@/lib/registration-email'

// Public route used by the event registration page; the email itself lives in lib/registration-email
export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = await sendRegistrationEmail(body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ success: true })
}
