// "Paste several" parser for the staff invite form: one player per line, values separated by comma,
// semicolon or tab. The name comes first; a value starting with http is the profile link, any other
// value is the phone. So "Name, 0151 2345678, https://www.fupa.net/player/..." and "Name, https://..." both work.
export interface InviteLine {
  name: string
  phone?: string
  profile_url?: string
}

export const parseInviteLines = (text: string): InviteLine[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/\s*[,;\t]\s*/).map((v) => v.trim())
      const row: InviteLine = { name }
      for (const v of rest) {
        if (!v) continue
        if (/^https?:\/\//i.test(v)) row.profile_url = row.profile_url ?? v
        else row.phone = row.phone ?? v
      }
      return row
    })
    .filter((r) => r.name)
