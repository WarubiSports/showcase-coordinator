import type { InvitePlayer, InviteWithPlayer, PlayerPosition } from '@/types'

const POSITION_ORDER: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

// College-eligible = Abitur or Fachabitur (the two school types US colleges accept directly)
export const isCollegeEligible = (player: InvitePlayer | null): boolean =>
  player?.school_type === 'abitur' || player?.school_type === 'fachabitur'

const Tile = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <div className="rounded-lg border bg-card p-3 text-center">
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
)

export const InviteStats = ({ invites }: { invites: InviteWithPlayer[] }) => {
  const accepted = invites.filter((i) => i.status === 'accepted')
  const declined = invites.filter((i) => i.status === 'declined').length
  const open = invites.filter((i) => i.status === 'invited').length
  const eligible = accepted.filter((i) => isCollegeEligible(i.player)).length
  const clips = accepted.filter((i) => i.player?.consent_profile_at).length
  const byPosition = POSITION_ORDER.map((pos) => ({ pos, n: accepted.filter((i) => i.player?.position === pos).length })).filter((x) => x.n > 0)
  const noPosition = accepted.filter((i) => !i.player?.position).length
  const signedN = invites.filter((i) => i.category === 'signed').length
  const newN = invites.filter((i) => i.category === 'new').length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile value={invites.length} label="Eingeladen" color="text-primary" />
        <Tile value={accepted.length} label="Zugesagt" color="text-green-600" />
        <Tile value={open} label="Keine Antwort" color="text-yellow-600" />
        <Tile value={declined} label="Abgesagt" color="text-gray-500" />
        <Tile value={eligible} label="College-eligible" color="text-blue-600" />
        <Tile value={clips} label="Clip-Einverständnis" color="text-purple-600" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Kategorie:</span>
        <span className="rounded-md border bg-card px-2 py-0.5 font-medium">Signed <span className="text-muted-foreground">{signedN}</span></span>
        <span className="rounded-md border bg-card px-2 py-0.5 font-medium">Neu <span className="text-muted-foreground">{newN}</span></span>
        {invites.length - signedN - newN > 0 && (
          <span className="rounded-md border border-dashed px-2 py-0.5 text-muted-foreground">nicht gesetzt {invites.length - signedN - newN}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Zusagen nach Position:</span>
        {byPosition.length === 0 && noPosition === 0 && <span className="text-muted-foreground">noch keine</span>}
        {byPosition.map(({ pos, n }) => (
          <span key={pos} className="rounded-md border bg-card px-2 py-0.5 font-medium">
            {pos} <span className="text-muted-foreground">{n}</span>
          </span>
        ))}
        {noPosition > 0 && (
          <span className="rounded-md border border-dashed px-2 py-0.5 text-muted-foreground">ohne Position {noPosition}</span>
        )}
      </div>
    </div>
  )
}
