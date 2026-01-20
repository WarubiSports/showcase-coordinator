'use client'

import { useState, useEffect } from 'react'
import { Check, Circle, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Milestone } from '@/types'

export function MilestonesTimeline() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMilestones = async () => {
      const { data } = await supabase
        .from('showcase_milestones')
        .select('*')
        .order('target_date', { ascending: true })

      setMilestones(data || [])
      setIsLoading(false)
    }

    fetchMilestones()
  }, [])

  const toggleMilestone = async (id: string, completed: boolean) => {
    await supabase
      .from('showcase_milestones')
      .update({ completed: !completed })
      .eq('id', id)

    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !completed } : m))
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const isPast = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Key Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Key Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {milestones.map((milestone, index) => {
              const isCompleted = milestone.completed
              const isOverdue = isPast(milestone.target_date) && !isCompleted

              return (
                <div key={milestone.id} className="relative flex gap-4 pl-8">
                  {/* Timeline dot */}
                  <button
                    onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                    className={cn(
                      'absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background transition-colors',
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isOverdue
                        ? 'border-red-500'
                        : 'border-muted-foreground/30 hover:border-primary'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Circle className="h-2 w-2" />
                    )}
                  </button>

                  <div className={cn('flex-1 pb-4', index === milestones.length - 1 && 'pb-0')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4
                          className={cn(
                            'font-medium',
                            isCompleted && 'text-muted-foreground line-through'
                          )}
                        >
                          {milestone.title}
                        </h4>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium whitespace-nowrap',
                          isCompleted
                            ? 'text-green-600'
                            : isOverdue
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatDate(milestone.target_date)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
