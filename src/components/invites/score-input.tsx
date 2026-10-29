'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fieldLabel, formatScore, parseScoreText, validateScore, type TestField } from '@/lib/selection-tests'
import { adoptServerValue, type SaveOutcome } from '@/lib/score-sync'
import { ScoreConflictError } from '@/hooks/use-selection-tests'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ScoreInputProps {
  field: TestField
  value: number | null
  placeholder: string
  disabled: boolean
  onSave: (value: number | null) => Promise<SaveOutcome>
}

// One attempt's value. Saves when the field is left; a small mark in the corner says saved, saving or error.
// The typed text stays authoritative while the tester is in the field, has typed something newer than what is being
// saved, or a save failed; only then does it give way to what the server holds.
export const ScoreInput = ({ field, value, placeholder, disabled, onSave }: ScoreInputProps) => {
  const [draft, setDraftState] = useState<string | null>(null)
  const [state, setState] = useState<SaveState>('idle')
  // Read inside the async save, where the render's values are already old
  const draftRef = useRef<string | null>(null)
  const focusedRef = useRef(false)
  const inFlight = useRef(0)
  const setDraft = (v: string | null) => {
    draftRef.current = v
    setDraftState(v)
  }

  const fail = (message: string) => {
    setState('error')
    toast.error(message)
  }

  const save = async () => {
    focusedRef.current = false
    const sent = draftRef.current
    if (sent === null) return
    const parsed = parseScoreText(sent)
    if ('error' in parsed) return fail(`${fieldLabel(field)}: ${parsed.error}`)
    const problem = validateScore(field, parsed.value)
    if (problem) return fail(problem)
    if (parsed.value === value && inFlight.current === 0) {
      setDraft(null)
      setState((s) => (s === 'error' ? 'idle' : s))
      return
    }
    inFlight.current++
    setState('saving')
    try {
      // 'stale': a newer save of this field is on its way and decides what shows
      if ((await onSave(parsed.value)) === 'stale') return
      if (adoptServerValue(sent, draftRef.current, focusedRef.current)) {
        setDraft(null)
        setState('saved')
      } else {
        setState('idle')
      }
    } catch (err) {
      if (err instanceof ScoreConflictError) {
        fail(`${fieldLabel(field)}: Wert wurde inzwischen von jemand anderem geändert: ${formatScore(err.current) || 'leer'}. Bitte prüfen.`)
      } else {
        fail(err instanceof Error ? err.message : 'Speichern hat nicht geklappt')
      }
    } finally {
      inFlight.current--
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        aria-label={fieldLabel(field)}
        aria-invalid={state === 'error' || undefined}
        placeholder={placeholder}
        disabled={disabled}
        value={draft ?? formatScore(value)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => { focusedRef.current = true }}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={cn(
          'h-12 w-full min-w-0 rounded-md border bg-background px-1 text-center text-base font-semibold tabular-nums outline-none',
          'placeholder:text-xs placeholder:font-normal placeholder:text-muted-foreground/70',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          state === 'saved' && 'border-green-500',
          state === 'error' && 'border-destructive text-destructive',
        )}
      />
      <span className="pointer-events-none absolute right-1 top-1" aria-live="polite">
        {state === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="speichert" />}
        {state === 'saved' && <Check className="h-3 w-3 text-green-600" aria-label="gespeichert" />}
        {state === 'error' && <AlertCircle className="h-3 w-3 text-destructive" aria-label="Fehler" />}
      </span>
    </div>
  )
}
