export interface StatCounts {
  games: number
  goals: number
  assists: number
}

const word = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// The counts as the card prints them: a count of 0 is left out ("3 Spiele · 2 Tore", not "... · 0 Vorlagen"),
// and no games means no line at all.
export const countsLine = (n: StatCounts): string | null => {
  if (!(n.games > 0)) return null
  return [word(n.games, 'Spiel', 'Spiele'), n.goals > 0 ? word(n.goals, 'Tor', 'Tore') : null, n.assists > 0 ? word(n.assists, 'Vorlage', 'Vorlagen') : null]
    .filter(Boolean)
    .join(' · ')
}

export const seasonLine = (s: (StatCounts & { season?: string | null }) | null | undefined): string | null => {
  const counts = s ? countsLine(s) : null
  if (!counts) return null
  return [s?.season ? `Saison ${s.season}` : null, counts].filter(Boolean).join(' · ')
}

export const careerLine = (c: StatCounts | null | undefined): string | null => {
  const counts = c ? countsLine(c) : null
  return counts ? `Karriere: ${counts}` : null
}
