// ITP move: the coordinator screens' table calls, carried to the server.
//
// On Warubi Core the showcase_* tables are closed to the public key (only the registration page's
// showcase_events read, showcase_event_scouts read, guarded showcase_players insert and the
// showcase_registration_count RPC stay public). The coordinator screens sit behind the admin basic
// auth, so once switched they send each table call to /api/admin/db, which replays it with the
// service client. This module is dependency-free so node --test can load it directly.

// Exactly the tables the coordinator screens call (census in tests/itp-move.test.mjs).
// showcase_players has its own admin routes; scouts and every non-showcase table stay out.
export const SHOWCASE_DB_TABLES = [
  'showcase_activity',
  'showcase_announcements',
  'showcase_attendees',
  'showcase_categories',
  'showcase_comments',
  'showcase_day_activities',
  'showcase_day_groups',
  'showcase_event_scouts',
  'showcase_events',
  'showcase_feedback',
  'showcase_matches',
  'showcase_materials',
  'showcase_milestones',
  'showcase_tasks',
  'showcase_venue_zones',
] as const

export const DB_ACTIONS = ['select', 'insert', 'update', 'delete'] as const
export const DB_FILTERS = ['eq', 'contains', 'ilike'] as const
export const MAX_ROWS = 1000

type Action = (typeof DB_ACTIONS)[number]
type FilterOp = (typeof DB_FILTERS)[number]
type Row = Record<string, unknown>

export interface DbRequest {
  table: string
  action: Action
  values: Row | Row[] | null
  // select: the columns read; insert/update/delete: the columns returned (null = nothing returned)
  columns: string | null
  filters: { op: FilterOp; column: string; value: unknown }[]
  order: { column: string; ascending: boolean }[]
  single: boolean
}

export interface DbError {
  message: string
  code?: string
  details?: string
  hint?: string
}

export interface DbResult {
  data: unknown
  error: DbError | null
}

export class DbRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DbRequestError'
  }
}

// Browsers can attach cached Basic credentials to a form submitted by another site.
// Require the coordinator's own JSON request before parsing any database operation.
export function isSameOriginJsonRequest(request: Pick<Request, 'url' | 'headers'>): boolean {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return false
  try {
    return request.headers.get('origin') === new URL(request.url).origin
  } catch {
    return false
  }
}

const IDENT = /^[a-z_][a-z0-9_]*$/
const EMBED = /^([a-z_][a-z0-9_]*)\(\*\)$/

const isTable = (t: unknown): t is string =>
  typeof t === 'string' && (SHOWCASE_DB_TABLES as readonly string[]).includes(t)

const isPlainRow = (v: unknown): v is Row =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).every((k) => IDENT.test(k))

const isScalar = (v: unknown) =>
  typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))

function checkColumns(columns: unknown): string {
  if (typeof columns !== 'string' || columns.length > 500) throw new DbRequestError('columns must be a short string')
  for (const raw of columns.split(',')) {
    const part = raw.trim()
    const embedded = part.match(EMBED)
    if (part === '*' || IDENT.test(part)) continue
    if (embedded && isTable(embedded[1])) continue
    throw new DbRequestError(`column not allowed: ${part.slice(0, 60)}`)
  }
  return columns
}

// Refuses anything outside the shapes the coordinator screens use; never builds raw SQL.
export function parseDbRequest(body: unknown): DbRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new DbRequestError('body must be an object')
  const b = body as Record<string, unknown>

  if (!isTable(b.table)) throw new DbRequestError('table not allowed')
  if (!(DB_ACTIONS as readonly unknown[]).includes(b.action)) throw new DbRequestError('action not allowed')
  const action = b.action as Action

  const filters = b.filters ?? []
  if (!Array.isArray(filters) || filters.length > 10) throw new DbRequestError('filters must be a short list')
  const parsedFilters = filters.map((f: unknown) => {
    const { op, column, value } = (f ?? {}) as Record<string, unknown>
    if (!(DB_FILTERS as readonly unknown[]).includes(op)) throw new DbRequestError('filter not allowed')
    if (typeof column !== 'string' || !IDENT.test(column)) throw new DbRequestError('filter column not allowed')
    const ok =
      op === 'eq' ? isScalar(value)
      : op === 'ilike' ? typeof value === 'string'
      : Array.isArray(value) && value.length <= 50 && value.every(isScalar)
    if (!ok) throw new DbRequestError(`bad value for ${String(op)}`)
    return { op: op as FilterOp, column, value }
  })

  const order = b.order ?? []
  if (!Array.isArray(order) || order.length > 5) throw new DbRequestError('order must be a short list')
  const parsedOrder = order.map((o: unknown) => {
    const { column, ascending } = (o ?? {}) as Record<string, unknown>
    if (typeof column !== 'string' || !IDENT.test(column) || typeof ascending !== 'boolean') {
      throw new DbRequestError('order not allowed')
    }
    return { column, ascending }
  })

  const columns = b.columns === null || b.columns === undefined ? null : checkColumns(b.columns)
  const single = b.single === true

  let values: Row | Row[] | null = null
  if (action === 'insert') {
    const rows = Array.isArray(b.values) ? b.values : [b.values]
    if (rows.length === 0 || rows.length > MAX_ROWS || !rows.every(isPlainRow)) {
      throw new DbRequestError('insert needs 1 to 1000 rows')
    }
    values = b.values as Row | Row[]
  } else if (action === 'update') {
    if (!isPlainRow(b.values) || Object.keys(b.values).length === 0) throw new DbRequestError('update needs values')
    values = b.values
  } else if (b.values !== undefined && b.values !== null) {
    throw new DbRequestError(`${action} takes no values`)
  }

  if (action === 'select' && columns === null) throw new DbRequestError('select needs columns')
  if (action === 'insert' && parsedFilters.length > 0) throw new DbRequestError('insert takes no filters')
  if (action !== 'select' && parsedOrder.length > 0) throw new DbRequestError('order is for select only')
  // A change always names its rows: no whole-table update or delete.
  if ((action === 'update' || action === 'delete') && !parsedFilters.some((f) => f.op === 'eq')) {
    throw new DbRequestError(`${action} needs an eq filter`)
  }
  if (single && columns === null) throw new DbRequestError('single needs columns')

  return { table: b.table, action, values, columns, filters: parsedFilters, order: parsedOrder, single }
}

// Minimal structural view of a supabase-js query builder (keeps this module dependency-free).
interface Chain extends PromiseLike<{ data: unknown; error: unknown }> {
  select(columns: string): Chain
  insert(values: unknown): Chain
  update(values: unknown): Chain
  delete(): Chain
  eq(column: string, value: unknown): Chain
  contains(column: string, value: unknown): Chain
  ilike(column: string, value: unknown): Chain
  order(column: string, options: { ascending: boolean }): Chain
  single(): Chain
}

// Server side: replays a parsed request on the service client, in supabase-js call order.
export async function runDbRequest(client: { from(table: string): unknown }, req: DbRequest): Promise<DbResult> {
  const from = client.from(req.table) as Chain
  let q =
    req.action === 'select' ? from.select(req.columns as string)
    : req.action === 'insert' ? from.insert(req.values)
    : req.action === 'update' ? from.update(req.values)
    : from.delete()
  for (const f of req.filters) q = q[f.op](f.column, f.value)
  if (req.action !== 'select' && req.columns !== null) q = q.select(req.columns)
  for (const o of req.order) q = q.order(o.column, { ascending: o.ascending })
  if (req.single) q = q.single()
  const { data, error } = await q
  if (!error) return { data: data ?? null, error: null }
  const e = error as Record<string, unknown>
  return {
    data: null,
    error: {
      message: typeof e.message === 'string' ? e.message : 'Database error',
      ...(typeof e.code === 'string' ? { code: e.code } : {}),
      ...(typeof e.details === 'string' ? { details: e.details } : {}),
      ...(typeof e.hint === 'string' ? { hint: e.hint } : {}),
    },
  }
}

// Browser side: the same chain the screens already write (from/select/insert/update/delete/eq/
// contains/ilike/order/single, awaited), recorded and sent as one request when awaited.
export function createDbProxy(send: (req: DbRequest) => Promise<DbResult>, storage: unknown) {
  const query = (table: string) => {
    const req: DbRequest = { table, action: 'select', values: null, columns: null, filters: [], order: [], single: false }
    let sent: Promise<DbResult> | null = null
    const setAction = (action: Action, values: DbRequest['values']) => {
      req.action = action
      req.values = values
      return chain
    }
    const chain = {
      select(columns = '*') {
        req.columns = columns
        return chain
      },
      insert: (values: Row | Row[]) => setAction('insert', values),
      update: (values: Row) => setAction('update', values),
      delete: () => setAction('delete', null),
      eq(column: string, value: unknown) {
        req.filters.push({ op: 'eq', column, value })
        return chain
      },
      contains(column: string, value: unknown) {
        req.filters.push({ op: 'contains', column, value })
        return chain
      },
      ilike(column: string, value: unknown) {
        req.filters.push({ op: 'ilike', column, value })
        return chain
      },
      order(column: string, options?: { ascending?: boolean }) {
        req.order.push({ column, ascending: options?.ascending ?? true })
        return chain
      },
      single() {
        req.single = true
        return chain
      },
      then<A = DbResult, B = never>(
        onFulfilled?: ((value: DbResult) => A | PromiseLike<A>) | null,
        onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
      ): Promise<A | B> {
        sent ??= send(req).catch((err: unknown) => ({
          data: null,
          error: { message: err instanceof Error ? err.message : 'Request failed' },
        }))
        return sent.then(onFulfilled, onRejected)
      },
    }
    return chain
  }
  return { from: query, storage }
}
