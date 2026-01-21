'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { useCategories } from '@/hooks/use-categories'
import { NameEntryDialog } from './name-entry-dialog'
import { Header } from './layout/header'
import { Sidebar } from './layout/sidebar'
import { MobileNav } from './layout/mobile-nav'
import { FeedbackButton } from './feedback/feedback-button'

interface AppShellProps {
  children: React.ReactNode
  selectedCategory?: string | null
  onCategorySelect?: (categoryId: string | null) => void
}

export function AppShell({ children, selectedCategory, onCategorySelect }: AppShellProps) {
  const { userName, setUserName, clearUserName, isLoading, hasUser } = useUser()
  const { categories } = useCategories()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [localCategory, setLocalCategory] = useState<string | null>(null)

  const handleCategorySelect = onCategorySelect || setLocalCategory
  const activeCategory = selectedCategory !== undefined ? selectedCategory : localCategory

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <NameEntryDialog open={!hasUser} onSubmit={setUserName} />

      <div className="min-h-screen bg-background">
        <Header
          userName={userName}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={clearUserName}
        />

        <Sidebar
          categories={categories}
          selectedCategory={activeCategory}
          onCategorySelect={handleCategorySelect}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="md:pl-64 pb-16 md:pb-0">
          <div className="container py-6 px-4 max-w-7xl">
            {children}
          </div>
        </main>

        <MobileNav />
        <FeedbackButton />
      </div>
    </>
  )
}
