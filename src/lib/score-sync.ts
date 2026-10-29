// Ordering of the field-by-field score saves on /invites/tests. Dependency-free so node --test loads it directly.
//
// Each save of one field (key "playerId:field") gets a sequence number. Only the answer to the latest save of that
// field may change what the page shows; an older answer arriving late is dropped. While a save is in flight, the
// next save of the same field expects the value being saved, not the older one on screen, so a quick correction
// by the same tester is not mistaken for someone else's change.

export type SaveOutcome = 'applied' | 'stale'

export const createScoreSync = () => {
  const pending = new Map<string, { seq: number; value: number | null }>()
  let counter = 0
  return {
    // Registers a save; returns its number and the value the server should still hold
    start(key: string, value: number | null, onScreen: number | null) {
      const before = pending.get(key)
      const seq = ++counter
      pending.set(key, { seq, value })
      return { seq, expected: before ? before.value : onScreen }
    },
    // True when this is still the latest save of the key (its answer counts); it then stops being pending
    finish(key: string, seq: number): boolean {
      if (pending.get(key)?.seq !== seq) return false
      pending.delete(key)
      return true
    },
  }
}

// After the latest save of a field succeeded: show the server value only if the tester has not typed anything
// newer since and is not in the field right now. Otherwise the typed text stays and is saved on its own blur.
export const adoptServerValue = (sentText: string, currentDraft: string | null, focused: boolean): boolean =>
  !focused && currentDraft === sentText
