// Profile links on invites and players: only FuPa and Transfermarkt, http(s). Shared by the forms and the routes.

const HOSTS = [/(^|\.)fupa\.net$/i, /(^|\.)transfermarkt\.[a-z]{2,}(\.[a-z]{2,})?$/i]

export const PROFILE_URL_ERROR = 'Der Profil-Link muss zu fupa.net oder transfermarkt führen und mit https:// beginnen.'
// Staff side (English), same rule
export const PROFILE_LINK_HINT = 'Only FuPa or Transfermarkt links work, starting with https://'

export const isProfileUrl = (value: string): boolean => {
  try {
    const u = new URL(value.trim())
    return (u.protocol === 'https:' || u.protocol === 'http:') && HOSTS.some((h) => h.test(u.hostname))
  } catch {
    return false
  }
}

// Trimmed string or null; validity is checked separately so the caller can return the German message
export const cleanProfileUrl = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : null
