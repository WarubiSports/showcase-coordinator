'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Send, Timer, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// What a Staff App login can reach: the invite list, the roster tab and the test entry. Nothing else in the
// sidebar, so there is no entry that would run into the admin password (Marvin, 23.10).
export const STAFF_NAVIGATION = [
  { name: 'Einladungen', href: '/invites', path: '/invites', tab: null, icon: Send },
  { name: 'Kader', href: '/invites?tab=roster', path: '/invites', tab: 'roster', icon: Users },
  { name: 'Tests', href: '/invites/tests', path: '/invites/tests', tab: null, icon: Timer },
] as const

interface StaffNavProps {
  onClick?: () => void
  itemClass: string
  activeClass: string
  idleClass: string
  iconClass: string
}

const Links = ({ onClick, itemClass, activeClass, idleClass, iconClass }: StaffNavProps) => {
  const pathname = usePathname()
  const tab = useSearchParams().get('tab') === 'roster' ? 'roster' : null
  return (
    <>
      {STAFF_NAVIGATION.map((item) => {
        const isActive = pathname === item.path && item.tab === tab
        return (
          <Link key={item.name} href={item.href} onClick={onClick} className={cn(itemClass, isActive ? activeClass : idleClass)}>
            <item.icon className={iconClass} />
            {item.name}
          </Link>
        )
      })}
    </>
  )
}

// useSearchParams needs a Suspense boundary on pages that are rendered statically
export const StaffNav = (props: StaffNavProps) => (
  <Suspense fallback={null}>
    <Links {...props} />
  </Suspense>
)
