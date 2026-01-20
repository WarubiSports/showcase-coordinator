'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface AnnouncementFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { title: string; content: string; pinned: boolean }) => Promise<void>
}

export function AnnouncementForm({ open, onClose, onSubmit }: AnnouncementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), pinned })
      onClose()
      setTitle('')
      setContent('')
      setPinned(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement..."
              rows={5}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="pinned"
              checked={pinned}
              onCheckedChange={(checked) => setPinned(checked as boolean)}
            />
            <Label htmlFor="pinned" className="text-sm font-normal">
              Pin this announcement to the top
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !content.trim() || isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post Announcement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
