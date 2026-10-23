// "Add several at once" parser: one player per line, phone optional after a comma (semicolon or tab work too).
// Links are not part of the paste; they come from Base or FuPa, or are added on the row afterwards.
export interface InviteLine {
  name: string
  phone?: string
}

export const parseInviteLines = (text: string): InviteLine[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/\s*[,;\t]\s*/).map((v) => v.trim())
      const phone = rest.find((v) => v && !/^https?:\/\//i.test(v))
      return phone ? { name, phone } : { name }
    })
    .filter((r) => r.name)
