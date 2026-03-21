'use client'

import { useState, useEffect } from 'react'
import { Bug, Lightbulb, Sparkles, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/contexts/event-context'
import type { Feedback, FeedbackStatus } from '@/types'
import { useUser } from '@/hooks/use-user'

const TYPE_CONFIG = {
  bug: { icon: Bug, label: 'Bug', color: 'bg-red-500' },
  feature: { icon: Sparkles, label: 'Feature', color: 'bg-blue-500' },
  idea: { icon: Lightbulb, label: 'Idea', color: 'bg-yellow-500' },
  other: { icon: MessageCircle, label: 'Other', color: 'bg-gray-500' },
}

const IMPORTANCE_CONFIG = {
  nice_to_have: { label: 'Nice to have', color: 'bg-slate-500' },
  helpful: { label: 'Helpful', color: 'bg-blue-500' },
  important: { label: 'Important', color: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'bg-red-500' },
}

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-purple-500' },
  reviewed: { label: 'Reviewed', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500' },
  done: { label: 'Done', color: 'bg-green-500' },
  dismissed: { label: 'Dismissed', color: 'bg-gray-500' },
}

export default function FeedbackPage() {
  const { userName } = useUser()
  const { currentEvent } = useEvent()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchFeedback()
  }, [currentEvent?.id])

  const fetchFeedback = async () => {
    setIsLoading(true)
    if (!currentEvent) return
    const { data, error } = await supabase
      .from('showcase_feedback')
      .select('*')
      .eq('event_id', currentEvent.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load feedback')
      return
    }

    setFeedback(data || [])
    setIsLoading(false)
  }

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    const { error } = await supabase
      .from('showcase_feedback')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userName,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, reviewed_by: userName, reviewed_at: new Date().toISOString() } : f))
    )
    toast.success('Status updated')
  }

  const copyPrompt = async (prompt: string, id: string) => {
    await navigator.clipboard.writeText(prompt)
    setCopiedId(id)
    toast.success('AI prompt copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredFeedback = feedback.filter((f) => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false
    if (filterType !== 'all' && f.type !== filterType) return false
    return true
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-96 animate-pulse rounded bg-muted" />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Feedback</h1>
            <p className="text-muted-foreground">Review submitted feedback and ideas</p>
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No feedback found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredFeedback.map((item) => {
              const typeConfig = TYPE_CONFIG[item.type]
              const importanceConfig = IMPORTANCE_CONFIG[item.importance]
              const statusConfig = STATUS_CONFIG[item.status]
              const TypeIcon = typeConfig.icon

              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn('p-2 rounded-lg', typeConfig.color)}>
                        <TypeIcon className="h-4 w-4 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.description}</span>
                          <Badge variant="outline" className={cn('text-xs text-white', statusConfig.color)}>
                            {statusConfig.label}
                          </Badge>
                          <Badge variant="outline" className={cn('text-xs text-white', importanceConfig.color)}>
                            {importanceConfig.label}
                          </Badge>
                        </div>

                        {item.details && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.details}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>by {item.submitted_by}</span>
                          <span>{formatDate(item.created_at)}</span>
                          {item.page_url && (
                            <span className="truncate max-w-48">{new URL(item.page_url).pathname}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.ai_prompt && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPrompt(item.ai_prompt!, item.id)}
                            title="Copy AI Prompt"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFeedback(item)}
                        >
                          View
                        </Button>

                        <Select
                          value={item.status}
                          onValueChange={(v) => updateStatus(item.id, v as FeedbackStatus)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback && (
                <>
                  {(() => {
                    const Icon = TYPE_CONFIG[selectedFeedback.type].icon
                    return <Icon className="h-5 w-5" />
                  })()}
                  {selectedFeedback.description}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={TYPE_CONFIG[selectedFeedback.type].color}>
                  {TYPE_CONFIG[selectedFeedback.type].label}
                </Badge>
                <Badge className={IMPORTANCE_CONFIG[selectedFeedback.importance].color}>
                  {IMPORTANCE_CONFIG[selectedFeedback.importance].label}
                </Badge>
                <Badge className={STATUS_CONFIG[selectedFeedback.status].color}>
                  {STATUS_CONFIG[selectedFeedback.status].label}
                </Badge>
              </div>

              {selectedFeedback.details && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Details</h4>
                  <p className="text-sm text-muted-foreground">{selectedFeedback.details}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Submitted by:</span>{' '}
                  {selectedFeedback.submitted_by}
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  {formatDate(selectedFeedback.created_at)}
                </div>
                {selectedFeedback.page_url && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Page:</span>{' '}
                    <a
                      href={selectedFeedback.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {new URL(selectedFeedback.page_url).pathname}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {selectedFeedback.ai_prompt && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">AI Prompt</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPrompt(selectedFeedback.ai_prompt!, selectedFeedback.id)}
                    >
                      {copiedId === selectedFeedback.id ? (
                        <>
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">
                    {selectedFeedback.ai_prompt}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
