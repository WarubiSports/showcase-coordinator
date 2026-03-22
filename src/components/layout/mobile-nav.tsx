'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, Megaphone, CalendarDays, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/constants'

const navigation: { name: string; href: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: true },
  { name: 'Players', href: '/players', icon: UserCircle },
  { name: 'Event Days', href: '/day-view', icon: CalendarDays, adminOnly: true },
  { name: 'News', href: '/announcements', icon: Megaphone, adminOnly: true },
]

interface MobileNavProps {
  userRole: UserRole
}

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname()
  const filteredNav = navigation.filter((item) => !item.adminOnly || userRole === 'admin')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around py-2">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
