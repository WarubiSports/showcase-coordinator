'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, UserCheck, ClipboardCheck, DollarSign } from 'lucide-react'
import type { Player, Attendee, Task } from '@/types'

interface HeroStatsProps {
  players: Player[]
  attendees: Attendee[]
  tasks: Task[]
  isLoading: boolean
}

export function HeroStats({ players, attendees, tasks, isLoading }: HeroStatsProps) {
  const coachCount = attendees.filter((a) => a.roles.includes('coach')).length
  const scoutCount = attendees.filter((a) => a.roles.includes('scout')).length
  const paidCount = players.filter((p) => p.payment_status === 'paid').length
  const urgentTasks = tasks.filter((t) => t.status !== 'complete' && (t.priority === 'urgent' || t.priority === 'high')).length

  const stats = [
    {
      label: 'Players',
      value: players.length,
      icon: Users,
      accent: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      sub: paidCount > 0 ? `${paidCount} paid` : undefined,
    },
    {
      label: 'Coaches & Scouts',
      value: coachCount + scoutCount,
      icon: UserCheck,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      sub: coachCount > 0 && scoutCount > 0 ? `${coachCount}C / ${scoutCount}S` : undefined,
    },
    {
      label: 'Paid',
      value: players.length > 0 ? `${Math.round((paidCount / players.length) * 100)}%` : '—',
      icon: DollarSign,
      accent: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      sub: players.length > 0 ? `${paidCount}/${players.length}` : undefined,
    },
    {
      label: 'Action Items',
      value: urgentTasks,
      icon: ClipboardCheck,
      accent: urgentTasks > 0 ? 'text-red-600' : 'text-green-600',
      bg: urgentTasks > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30',
      sub: urgentTasks === 0 ? 'All clear' : 'urgent/high',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={`${stat.bg} border-0 shadow-sm`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className={`text-3xl font-bold ${stat.accent} mt-1`}>
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                )}
              </div>
              <stat.icon className={`h-5 w-5 ${stat.accent} opacity-60`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
