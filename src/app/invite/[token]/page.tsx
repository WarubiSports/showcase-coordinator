'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { InviteLanding } from '@/components/invite/invite-landing'
import { AcceptForm } from '@/components/invite/accept-form'
import { InviteDone } from '@/components/invite/invite-done'
import { BaseNotice } from '@/components/invite/base-notice'
import { SignedConfirm } from '@/components/invite/signed-confirm'
import { InviteError } from '@/components/invite/invite-error'
import { initialAcceptForm, type AcceptFormState, type InvitePayload } from '@/components/invite/invite-types'

type View = 'landing' | 'confirm' | 'form' | 'accepted' | 'declined'
const GENERIC_ERROR = 'Das hat nicht geklappt. Bitte versuch es noch einmal.'

// Player side of a selection invite: German, mobile first, no login. The token in the URL is the key.
export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<InvitePayload | null>(null)
  const [loadError, setLoadError] = useState<'not_found' | 'unavailable' | null>(null)
  const [view, setView] = useState<View>('landing')
  const [form, setForm] = useState<AcceptFormState | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, { cache: 'no-store' })
    if (!res.ok) {
      setLoadError(res.status === 404 ? 'not_found' : 'unavailable')
      return null
    }
    const payload = (await res.json()) as InvitePayload
    setData(payload)
    return payload
  }, [token])

  useEffect(() => {
    load().then((payload) => {
      if (!payload) return
      setView(payload.invite.status === 'accepted' ? 'accepted' : payload.invite.status === 'declined' ? 'declined' : 'landing')
    })
  }, [load])

  const respond = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/invite/${encodeURIComponent(token)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(typeof json.error === 'string' && json.error !== 'not_found' ? json.error : GENERIC_ERROR)
  }

  // A player already signed with Athletes USA and linked in Base confirms what we know instead of retyping it;
  // everyone else, and anyone editing after the answer, gets the full form
  const openForm = () => {
    if (data) setForm((prev) => prev ?? initialAcceptForm(data))
    setFormError(null)
    setView(data?.invite.category === 'signed' && data.base && data.invite.status === 'invited' ? 'confirm' : 'form')
  }

  const decline = async () => {
    try {
      await respond({ action: 'decline' })
      await load()
      setView('declined')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : GENERIC_ERROR)
    }
  }

  const submitAccept = async () => {
    if (!form) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await respond({
        action: 'accept',
        form: { ...form, is_adult: form.is_adult === 'ja' ? true : form.is_adult === 'nein' ? false : null },
      })
      await load()
      setView('accepted')
      window.scrollTo({ top: 0 })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : GENERIC_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ausa-ink-50 text-ausa-ink-900">
      <header className="border-b border-ausa-ink-200 bg-ausa-paper">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-3">
          <Image src="/logo-ausa.png" alt="Athletes USA" width={1235} height={608} priority className="h-8 w-auto" />
          <Image src="/warubi-sports-logo.png" alt="Warubi Sports" width={288} height={94} className="h-7 w-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 py-6 pb-16">
        {loadError ? (
          <InviteError kind={loadError} />
        ) : !data ? (
          <div className="flex justify-center pt-12"><Loader2 className="h-6 w-6 animate-spin text-ausa-ink-400" /></div>
        ) : view === 'confirm' && form ? (
          <SignedConfirm
            form={form}
            eventYear={new Date(data.event.start_date + 'T00:00:00').getFullYear()}
            isSubmitting={isSubmitting}
            error={formError}
            onChange={(patch) => setForm((prev) => (prev ? { ...prev, ...patch } : prev))}
            onSubmit={submitAccept}
            onEdit={() => setView('form')}
            onBack={() => setView('landing')}
          />
        ) : view === 'form' && form ? (
          <div className="space-y-5">
            {data.base && <BaseNotice base={data.base} />}
            <AcceptForm
            form={form}
            eventYear={new Date(data.event.start_date + 'T00:00:00').getFullYear()}
            isSubmitting={isSubmitting}
            error={formError}
            onChange={(patch) => setForm((prev) => (prev ? { ...prev, ...patch } : prev))}
            onSubmit={submitAccept}
            onBack={() => setView(data.invite.status === 'accepted' ? 'accepted' : data.invite.status === 'declined' ? 'declined' : 'landing')}
            />
          </div>
        ) : view === 'accepted' || view === 'declined' ? (
          <>
            <InviteDone data={data} variant={view} onEdit={openForm} onDecline={decline} />
            {formError && <p className="mt-4 rounded-xl bg-ausa-accent-soft px-4 py-3 text-sm text-ausa-accent-ink">{formError}</p>}
          </>
        ) : (
          <>
            <InviteLanding data={data} onAccept={openForm} onDecline={decline} />
            {formError && <p className="mt-4 rounded-xl bg-ausa-accent-soft px-4 py-3 text-sm text-ausa-accent-ink">{formError}</p>}
          </>
        )}
      </main>
      <footer className="mx-auto max-w-md px-5 pb-8 text-center text-xs text-ausa-ink-400">Athletes USA · Warubi Sports</footer>
    </div>
  )
}
