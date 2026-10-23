import { fetchableFupaUrl, isFupaUrl, parseFupaHtml, type FupaProfile } from '@/lib/fupa'

// FuPa enrichment, fetching half. Server only. A direct fetch of the page is tried first, with redirects followed by
// hand so that every hop stays on fupa.net over https; Firecrawl (rawHtml only, no LLM) is the fallback when
// FIRECRAWL_API_KEY is set.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

const MAX_BYTES = 3_000_000 // a FuPa player page is about 125 KB

const readCapped = async (res: Response): Promise<string | null> => {
  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES || !res.body) return null
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks.map((c) => Buffer.from(c))))
}

// Redirects are followed by hand so that every hop stays on fupa.net over https (no server-side request to other hosts)
const fetchDirect = async (url: string): Promise<string | null> => {
  let current = fetchableFupaUrl(url)
  for (let hop = 0; hop < 4 && current; hop++) {
    let res: Response
    try {
      res = await fetch(current, { headers: { 'User-Agent': UA, 'Accept-Language': 'de-DE,de;q=0.9' }, redirect: 'manual', signal: AbortSignal.timeout(12000), cache: 'no-store' })
    } catch {
      return null
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      current = location ? fetchableFupaUrl(new URL(location, current).toString()) : null
      continue
    }
    return res.ok ? readCapped(res) : null
  }
  return null
}

// Firecrawl fallback: rawHtml only (the page data is in the HTML, no LLM extraction needed)
const fetchFirecrawl = async (url: string): Promise<string | null> => {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['rawHtml'] }),
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { rawHtml?: string } }
    return json.data?.rawHtml ?? null
  } catch {
    return null
  }
}

export type FupaResult = { ok: true; profile: FupaProfile; source: 'direct' | 'firecrawl' } | { ok: false; reason: 'not_fupa' | 'unreachable' | 'no_data' }

export const fetchFupaProfile = async (url: string): Promise<FupaResult> => {
  if (!isFupaUrl(url)) return { ok: false, reason: 'not_fupa' }
  const direct = await fetchDirect(url)
  // Firecrawl receives the normalised https URL as well
  const fromDirect = direct ? parseFupaHtml(direct) : null
  if (fromDirect) return { ok: true, profile: fromDirect, source: 'direct' }
  const raw = await fetchFirecrawl(fetchableFupaUrl(url) ?? url)
  const fromFirecrawl = raw ? parseFupaHtml(raw) : null
  if (fromFirecrawl) return { ok: true, profile: fromFirecrawl, source: 'firecrawl' }
  return { ok: false, reason: direct || raw ? 'no_data' : 'unreachable' }
}
