// Photo URLs a player card may show: FuPa's image host, the app's own Supabase storage (Base keeps its
// profile pictures in Warubi Core storage) and athletesusa.org. https only, nothing else; a photo on any
// other host is dropped rather than shown.
const FUPA = /(^|\.)fupa\.net$/i
const AUSA = /(^|\.)athletesusa\.org$/i

const ownStorageHost = (): string | null => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null
  } catch {
    return null
  }
}

export const safeBasePhotoUrl = (url: string | null | undefined, storageHost: string | null = ownStorageHost()): string | null => {
  if (!url?.trim()) return null
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'https:') return null
    const h = u.hostname
    return FUPA.test(h) || AUSA.test(h) || (!!storageHost && h === storageHost) ? u.toString() : null
  } catch {
    return null
  }
}
