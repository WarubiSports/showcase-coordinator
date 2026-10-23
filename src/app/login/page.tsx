'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createStaffBrowserClient } from '@/lib/staff-browser'

const INPUT = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-transparent'
const FAILED = 'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.'
const NOT_STAFF = 'Kein Staff-Zugang für dieses Konto.'

// Only paths inside this app; anything else goes to the invite area
const safeNext = (value: string | null) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/invites')

const LoginForm = () => {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const supabase = createStaffBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) {
      setError(FAILED)
      setBusy(false)
      return
    }
    // Same gate as the Staff App: an auth user without a staff profile is signed out again
    const me = await fetch('/api/admin/me', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { staff: null })).catch(() => ({ staff: null }))
    if (!me.staff) {
      await supabase.auth.signOut()
      setError(NOT_STAFF)
      setBusy(false)
      return
    }
    router.replace(next)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">E-Mail</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Passwort</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={busy || !email || !password} className="w-full rounded-md bg-gray-950 py-3 font-semibold text-white disabled:opacity-50">
        {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Einen Moment...</span> : 'Anmelden'}
      </button>
      <p className="text-center text-sm text-gray-500">Gleiche Zugangsdaten wie in der Staff App.</p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-md px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Athletes USA · Warubi Sports</p>
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 py-8">
        <h1 className="mb-6 text-2xl font-bold">Anmelden</h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}
