'use client'

import { useEffect, useState } from 'react'
import { resolveBase, resolveFupa, type BaseMatch, type LookupState } from '@/lib/lookup-resolve'
import type { FupaCandidate } from '@/types'

// Runs the Base lookup and, when Base has nobody, the FuPa search for a typed name (debounced). Picks made by
// staff override the automatic state until the name changes.
export const useLookup = (name: string) => {
  const [state, setState] = useState<LookupState>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)
  const [pickedFor, setPickedFor] = useState<string | null>(null)
  const query = name.trim()

  useEffect(() => {
    if (pickedFor === query) return
    if (query.length < 3) {
      setState({ kind: 'idle' })
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        const base = await fetch(`/api/admin/athletes?q=${encodeURIComponent(query)}`, { signal: ctrl.signal, cache: 'no-store' })
        const matches: BaseMatch[] = base.ok ? await base.json() : []
        const fromBase = resolveBase(query, matches)
        if (fromBase) {
          setState(fromBase)
          return
        }
        const fupa = await fetch(`/api/admin/fupa-search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal, cache: 'no-store' })
        const candidates: FupaCandidate[] | null = fupa.ok ? await fupa.json() : null
        setState(resolveFupa(candidates))
      } catch {
        // aborted by the next keystroke, or offline: keep what is shown
      } finally {
        if (!ctrl.signal.aborted) setBusy(false)
      }
    }, 400)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, pickedFor])

  // Staff picks a Base row, a FuPa hit, or says the player is not there; the pick sticks for this name
  const pick = (next: LookupState) => {
    setPickedFor(query)
    setState(next)
  }
  const notInBase = async () => {
    setPickedFor(query)
    setBusy(true)
    try {
      const fupa = await fetch(`/api/admin/fupa-search?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
      setState(resolveFupa(fupa.ok ? await fupa.json() : null))
    } catch {
      setState({ kind: 'none' })
    } finally {
      setBusy(false)
    }
  }

  return { state, busy, pick, notInBase }
}
