'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from 'qrcode.react'
import { Link2, QrCode, Download, Copy, Check, X } from 'lucide-react'
import type { ShowcaseEvent, Player } from '@/types'

interface QuickActionsProps {
  event: ShowcaseEvent | null
  players: Player[]
}

export function QuickActions({ event, players }: QuickActionsProps) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  if (!event) return null

  const eventUrl = `https://showcase-coordinator.vercel.app/event/${event.slug}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(eventUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCsv = () => {
    if (players.length === 0) return

    const headers = ['Name', 'Position', 'Birth Year', 'Club', 'Country', 'Email', 'Phone', 'Parent Name', 'Parent Email', 'Parent Phone', 'Payment', 'Registered']
    const rows = players.map((p) => [
      p.name,
      p.position || '',
      p.birth_year?.toString() || '',
      p.club || '',
      p.country || '',
      p.email || '',
      p.phone || '',
      p.parent_name || '',
      p.parent_email || '',
      p.parent_phone || '',
      p.payment_status,
      p.registered_at ? new Date(p.registered_at).toLocaleDateString() : p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.slug}-players.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
              Quick Actions
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={copyLink}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy Registration Link'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowQr(!showQr)}
            >
              <QrCode className="h-3.5 w-3.5" />
              QR Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={exportCsv}
              disabled={players.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export Roster ({players.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowQr(false)}>
          <div
            className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900">{event.name}</h3>
                <p className="text-sm text-gray-500">Scan to register</p>
              </div>
              <button onClick={() => setShowQr(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCodeSVG
                value={eventUrl}
                size={220}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 break-all">{eventUrl}</p>
            <Button className="mt-4 w-full" size="sm" onClick={copyLink}>
              {copied ? (
                <><Check className="h-4 w-4 mr-1" /> Copied!</>
              ) : (
                <><Copy className="h-4 w-4 mr-1" /> Copy Link</>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
