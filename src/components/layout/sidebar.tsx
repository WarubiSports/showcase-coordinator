'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, Megaphone, CalendarDays, Users, X, MessageSquarePlus, UserCircle, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { Category } from '@/types'
import type { UserRole } from '@/lib/constants'

interface SidebarProps {
  categories: Category[]
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
  isOpen: boolean
  onClose: () => void
  userRole: UserRole
}

const navigation: { name: string; href: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: true },
  { name: 'Event Days', href: '/day-view', icon: CalendarDays, adminOnly: true },
  { name: 'Players', href: '/players', icon: UserCircle },
  { name: 'Attendees', href: '/attendees', icon: Users, adminOnly: true },
  { name: 'Announcements', href: '/announcements', icon: Megaphone, adminOnly: true },
  { name: 'Feedback', href: '/feedback', icon: MessageSquarePlus },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ categories, selectedCategory, onCategorySelect, isOpen, onClose, userRole }: SidebarProps) {
  const pathname = usePathname()
  const filteredNav = navigation.filter((item) => !item.adminOnly || userRole === 'admin')

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Close button (mobile) */}
          <div className="flex items-center justify-end p-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3 py-2">
            {/* Navigation */}
            <div className="space-y-1">
              {filteredNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {userRole === 'admin' && <Separator className="my-4" />}

            {/* Categories filter (admin only) */}
            <div className="space-y-1" style={{ display: userRole === 'admin' ? undefined : 'none' }}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Categories
              </h3>
              <button
                onClick={() => {
                  onCategorySelect(null)
                  onClose()
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  selectedCategory === null
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategorySelect(category.id)
                    onClose()
                  }}
                  title={category.name}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    selectedCategory === category.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="truncate">{category.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </>
  )
}
