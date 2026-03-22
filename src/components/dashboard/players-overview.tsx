'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import type { Player, PlayerPosition } from '@/types'

interface PlayersOverviewProps {
  players: Player[]
  isLoading: boolean
}

const POSITION_GROUPS: { label: string; positions: PlayerPosition[]; color: string }[] = [
  { label: 'GK', positions: ['GK'], color: 'bg-yellow-500' },
  { label: 'DEF', positions: ['CB', 'LB', 'RB'], color: 'bg-blue-500' },
  { label: 'MID', positions: ['CDM', 'CM', 'CAM'], color: 'bg-green-500' },
  { label: 'ATT', positions: ['LW', 'RW', 'ST'], color: 'bg-red-500' },
]

export function PlayersOverview({ players, isLoading }: PlayersOverviewProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-lg bg-muted" />
  }

  // Position breakdown
  const positionCounts = POSITION_GROUPS.map((group) => ({
    ...group,
    count: players.filter((p) => p.position && group.positions.includes(p.position)).length,
  }))
  const unassigned = players.filter((p) => !p.position).length

  // Recent registrations (last 5)
  const recentPlayers = [...players]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  // Country breakdown
  const countries = players.reduce<Record<string, number>>((acc, p) => {
    const country = p.country || 'Unknown'
    acc[country] = (acc[country] || 0) + 1
    return acc
  }, {})
  const topCountries = Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Players
          </CardTitle>
          <Badge variant="secondary" className="text-base px-3 py-1">
            {players.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Position Breakdown - Visual Bar */}
        {players.length > 0 ? (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                By Position
              </p>
              <div className="flex rounded-full overflow-hidden h-6">
                {positionCounts.map((group) =>
                  group.count > 0 ? (
                    <div
                      key={group.label}
                      className={`${group.color} flex items-center justify-center text-white text-xs font-bold`}
                      style={{ width: `${(group.count / players.length) * 100}%`, minWidth: '2rem' }}
                      title={`${group.label}: ${group.count}`}
                    >
                      {group.count}
                    </div>
                  ) : null
                )}
                {unassigned > 0 && (
                  <div
                    className="bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold"
                    style={{ width: `${(unassigned / players.length) * 100}%`, minWidth: '2rem' }}
                    title={`Unassigned: ${unassigned}`}
                  >
                    {unassigned}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {positionCounts.map((group) => (
                  <span key={group.label} className="flex items-center gap-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${group.color}`} />
                    {group.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Country Breakdown */}
            {topCountries.length > 0 && topCountries[0][0] !== 'Unknown' && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  By Country
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topCountries.map(([country, count]) => (
                    <Badge key={country} variant="outline" className="text-xs">
                      {country} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Registrations */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Recent Registrations
              </p>
              <div className="space-y-1.5">
                {recentPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{player.name}</span>
                      {player.position && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {player.position}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {player.club && (
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {player.club}
                        </span>
                      )}
                      <Badge
                        variant={player.payment_status === 'paid' ? 'default' : 'secondary'}
                        className={`text-[10px] px-1.5 py-0 ${
                          player.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : ''
                        }`}
                      >
                        {player.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No players registered yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
