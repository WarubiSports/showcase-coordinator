'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { Comment } from '@/types'

interface TaskCommentsProps {
  taskId: string
  userName: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function TaskComments({ taskId, userName }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from('showcase_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      setComments(data || [])
      setIsLoading(false)
    }

    fetchComments()
  }, [taskId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('showcase_comments')
        .insert([
          {
            task_id: taskId,
            author: userName,
            content: newComment.trim(),
          },
        ])
        .select()
        .single()

      if (error) throw error

      setComments((prev) => [...prev, data])
      setNewComment('')

      // Log activity
      await supabase.from('showcase_activity').insert([
        {
          entity_type: 'task',
          entity_id: taskId,
          action: 'commented',
          actor: userName,
          details: { comment: newComment.trim().slice(0, 100) },
        },
      ])
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Comments ({comments.length})</h3>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getInitials(comment.author)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1 resize-none"
        />
        <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmitting}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
