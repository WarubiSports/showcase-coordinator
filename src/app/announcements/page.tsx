'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { AnnouncementCard } from '@/components/announcements/announcement-card'
import { AnnouncementForm } from '@/components/announcements/announcement-form'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/use-user'
import type { Announcement } from '@/types'

export default function AnnouncementsPage() {
  const { userName } = useUser()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('showcase_announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load announcements')
      return
    }

    setAnnouncements(data || [])
    setIsLoading(false)
  }

  const handleCreate = async (data: { title: string; content: string; pinned: boolean }) => {
    const { data: newAnnouncement, error } = await supabase
      .from('showcase_announcements')
      .insert([
        {
          ...data,
          author: userName || 'Unknown',
        },
      ])
      .select()
      .single()

    if (error) {
      toast.error('Failed to create announcement')
      throw error
    }

    setAnnouncements((prev) => {
      if (newAnnouncement.pinned) {
        return [newAnnouncement, ...prev]
      }
      const pinnedCount = prev.filter((a) => a.pinned).length
      return [...prev.slice(0, pinnedCount), newAnnouncement, ...prev.slice(pinnedCount)]
    })

    // Log activity
    await supabase.from('showcase_activity').insert([
      {
        entity_type: 'announcement',
        entity_id: newAnnouncement.id,
        action: 'created',
        actor: userName || 'Unknown',
        details: { title: data.title },
      },
    ])

    toast.success('Announcement posted')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    const { error } = await supabase.from('showcase_announcements').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete announcement')
      return
    }

    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    toast.success('Announcement deleted')
  }

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('showcase_announcements')
      .update({ pinned: !currentPinned })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update announcement')
      return
    }

    setAnnouncements((prev) =>
      prev
        .map((a) => (a.id === id ? { ...a, pinned: !currentPinned } : a))
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    )

    toast.success(currentPinned ? 'Announcement unpinned' : 'Announcement pinned')
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">Team-wide updates and important messages</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">No announcements yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create the first announcement to share with your team
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}

        <AnnouncementForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreate}
        />
      </div>
    </AppShell>
  )
}
