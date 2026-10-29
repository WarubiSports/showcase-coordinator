// Ordering of the field-by-field score saves on /invites/tests. Dependency-free so node --test loads it directly.
//
// Saves of one field (key "playerId:field") run one after another: the next is sent only once the previous one has
// settled, and expects the value that one actually stored. After a conflict or an error it keeps the older guard, so
// it conflicts too rather than overwrite someone else's value unseen. Answers therefore arrive in order; only the
// answer to the latest save decides what the input shows. A roster reload keeps the fields saved since it started.

export type SaveOutcome = 'applied' | 'stale'
export type SaveResult = { stored: number | null; conflict: boolean }
export type Settled = { ok: true; result: SaveResult; latest: boolean } | { ok: false; error: unknown; latest: boolean }

export const createScoreQueue = () => {
  const tails = new Map<string, Promise<unknown>>()
  const stored = new Map<string, number | null>()
  const queued = new Map<string, number>()
  const lastSeq = new Map<string, number>()
  const touchedAt = new Map<string, number>()
  let clock = 0
  const touch = (key: string) => touchedAt.set(key, ++clock)

  return {
    // Queues send(expected) behind earlier saves of the key; never rejects
    run(key: string, onScreen: number | null, send: (expected: number | null) => Promise<SaveResult>): Promise<Settled> {
      const seq = ++clock
      lastSeq.set(key, seq)
      queued.set(key, (queued.get(key) ?? 0) + 1)
      touch(key)
      const turn = (tails.get(key) ?? Promise.resolve()).then(async (): Promise<Settled> => {
        const expected = stored.has(key) ? (stored.get(key) as number | null) : onScreen
        try {
          const result = await send(expected)
          if (!result.conflict) stored.set(key, result.stored)
          return { ok: true, result, latest: lastSeq.get(key) === seq }
        } catch (error) {
          return { ok: false, error, latest: lastSeq.get(key) === seq }
        } finally {
          touch(key)
          const left = (queued.get(key) ?? 1) - 1
          if (left > 0) queued.set(key, left)
          else {
            queued.delete(key)
            stored.delete(key)
          }
        }
      })
      tails.set(key, turn)
      return turn
    },
    // A point in time to compare with: was a field saved (or queued) after it?
    now: () => clock,
    touchedSince: (key: string, since: number) => (touchedAt.get(key) ?? 0) > since,
  }
}

// A reloaded roster, except the fields saved or queued since the reload started: those keep what is on the page
export const mergeFetched = <T extends { id: string }>(fresh: T[], current: T[], fields: readonly string[], keep: (id: string, field: string) => boolean): T[] =>
  fresh.map((p) => {
    const mine = current.find((c) => c.id === p.id) as Record<string, unknown> | undefined
    if (!mine) return p
    const kept = fields.filter((f) => keep(p.id, f))
    return kept.length ? { ...p, ...Object.fromEntries(kept.map((f) => [f, mine[f]])) } : p
  })

// After the latest save of a field succeeded: show the server value only if the tester has not typed anything
// newer since and is not in the field right now. Otherwise the typed text stays and is saved on its own blur.
export const adoptServerValue = (sentText: string, currentDraft: string | null, focused: boolean): boolean =>
  !focused && currentDraft === sentText
