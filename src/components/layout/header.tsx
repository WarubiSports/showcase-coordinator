'use client'

import { useState, useEffect, useMemo } from 'react'
import { Menu, Bell, User, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useEvent } from '@/contexts/event-context'
import { getEventStartDate } from '@/lib/constants'

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

function getCountdown(target: Date | null) {
  if (!target) return { days: 0, hours: 0, minutes: 0, isLive: false }
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isLive: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, isLive: false }
}

export function Header({ userName, onMenuClick, onLogout }: HeaderProps) {
  const { events, currentEvent, setCurrentEvent } = useEvent()
  const eventStart = useMemo(() => getEventStartDate(currentEvent), [currentEvent])
  const [countdown, setCountdown] = useState(getCountdown(eventStart))

  useEffect(() => {
    setCountdown(getCountdown(eventStart))
    const interval = setInterval(() => {
      setCountdown(getCountdown(eventStart))
    }, 60000)
    return () => clearInterval(interval)
  }, [eventStart])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            {/* Event switcher */}
            {events.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-lg font-bold leading-tight hover:text-primary transition-colors">
                    {currentEvent?.name || 'Select Event'}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {events.map(event => (
                    <DropdownMenuItem
                      key={event.id}
                      onClick={() => setCurrentEvent(event)}
                      className={event.id === currentEvent?.id ? 'bg-accent' : ''}
                    >
                      <div>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-xs text-muted-foreground">{event.location}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <h1 className="text-lg font-bold leading-tight">{currentEvent?.name || 'Showcase Coordinator'}</h1>
            )}
            <p className="text-xs text-muted-foreground">{currentEvent?.location || ''}</p>
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
