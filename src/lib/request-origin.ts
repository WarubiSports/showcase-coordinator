// The origin a page was requested on, for metadataBase: og:image and twitter:image then carry the host the
// player opened (showcase-coordinator.vercel.app or auswahl.athletesusa.org), not whichever domain Vercel
// lists as the production URL. Behind Vercel's proxy the host arrives in x-forwarded-host.
interface HeaderReader {
  get(name: string): string | null
}
type OriginEnv = { [key: string]: string | undefined }

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i

const first = (v: string | null) => v?.split(',')[0].trim() || null

export const requestOrigin = (headers: HeaderReader, env: OriginEnv = process.env): URL | undefined => {
  const host = first(headers.get('x-forwarded-host')) ?? first(headers.get('host'))
  if (host && HOST.test(host)) {
    const proto = first(headers.get('x-forwarded-proto')) ?? (LOCAL.test(host) ? 'http' : 'https')
    if (proto === 'http' || proto === 'https') return new URL(`${proto}://${host}`)
  }
  // No usable request (build time, or a header that is not a host name): Vercel's own URL, else nothing
  const fallback = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL
  return fallback ? new URL(`https://${fallback}`) : undefined
}
