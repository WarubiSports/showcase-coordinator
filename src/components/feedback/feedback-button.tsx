'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackModal } from './feedback-modal'
import { useUser } from '@/hooks/use-user'

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { userName } = useUser()

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-sm transition-all hover:scale-105 hover:shadow-xl animate-pulse hover:animate-none"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      <FeedbackModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        userName={userName || undefined}
      />
    </>
  )
}
