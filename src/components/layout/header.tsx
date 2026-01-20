'use client'

import { useState, useEffect } from 'react'
import { Menu, Bell, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EVENT_DATE, EVENT_LOCATION } from '@/lib/constants'

interface HeaderProps {
  userName: string | null
  onMenuClick: () => void
  onLogout: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getCountdown() {
  const now = new Date()
  const diff = EVENT_DATE.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isLive: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, isLive: false }
}

export function Header({ userName, onMenuClick, onLogout }: HeaderProps) {
  const [countdown, setCountdown] = useState(getCountdown())

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight">College Pro Showcase</h1>
            <p className="text-xs text-muted-foreground">{EVENT_LOCATION}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Countdown */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5">
            {countdown.isLive ? (
              <span className="text-sm font-semibold text-primary animate-pulse">Event Live!</span>
            ) : (
              <>
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-bold text-primary">{countdown.days}</span>
                  <span className="text-muted-foreground">d</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-bold text-primary">{countdown.hours}</span>
                  <span className="text-muted-foreground">h</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-bold text-primary">{countdown.minutes}</span>
                  <span className="text-muted-foreground">m</span>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          {userName && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  <span>{userName}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Change Name</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
