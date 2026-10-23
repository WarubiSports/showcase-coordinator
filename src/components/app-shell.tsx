'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { useStaff } from '@/hooks/use-staff'
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
  const { userName, setUserName, clearUserName, userRole, setUserRole, isLoading, hasUser } = useUser()
  const { staff, loaded: staffLoaded, firstName: staffFirstName } = useStaff()
  const { categories } = useCategories()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [localCategory, setLocalCategory] = useState<string | null>(null)

  const handleCategorySelect = onCategorySelect || setLocalCategory
  const activeCategory = selectedCategory !== undefined ? selectedCategory : localCategory

  // A Staff App login already says who this is: the stored name is seeded from the staff profile (first name,
  // the same value the invite form's "Invited by" uses) and the name dialog never opens. Basic-auth visitors
  // keep the dialog as before; it only waits until the staff check has answered.
  useEffect(() => {
    if (!isLoading && !hasUser && staff && staffFirstName) setUserName(staffFirstName)
  }, [isLoading, hasUser, staff, staffFirstName, setUserName])
  const askForName = !hasUser && staffLoaded && !(staff && staffFirstName)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <NameEntryDialog open={askForName} onSubmit={setUserName} />

      <div className="min-h-screen bg-background">
        <Header
          userName={userName}
          userRole={userRole}
          onRoleToggle={() => setUserRole(userRole === 'admin' ? 'coach' : 'admin')}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={clearUserName}
          staffSession={!!staff}
        />

        <Sidebar
          categories={categories}
          selectedCategory={activeCategory}
          onCategorySelect={handleCategorySelect}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userRole={userRole}
          staffSession={!!staff}
        />

        <main className="md:pl-64 pb-16 md:pb-0">
          <div className="container py-6 px-4 max-w-7xl">
            {children}
          </div>
        </main>

        <MobileNav userRole={userRole} staffSession={!!staff} />
        <FeedbackButton />
      </div>
    </>
  )
}
