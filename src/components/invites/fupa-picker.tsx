'use client'

import { Button } from '@/components/ui/button'
import type { FupaCandidate } from '@/types'

interface FupaPickerProps {
  candidates: FupaCandidate[]
  onPick: (candidate: FupaCandidate) => void
  onDismiss: () => void
}

// FuPa search hits for an invite without a link: staff picks the right player or says the player is not on FuPa
export const FupaPicker = ({ candidates, onPick, onDismiss }: FupaPickerProps) => (
  <div className="mt-2 rounded-md border border-dashed p-2 text-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">FuPa: {candidates.length} Treffer</span>
      <Button variant="ghost" size="sm" onClick={onDismiss}>Nicht auf FuPa</Button>
    </div>
    {candidates.length > 0 && (
      <ul className="mt-1 space-y-1">
        {candidates.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-accent">
              {(c.club_image || c.image) && (
                // FuPa serves these from image.fupa.net; next/image would need that host allow-listed
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.club_image ?? c.image ?? ''} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
              )}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{c.club ?? 'ohne Verein'}</span>
                <span className="text-muted-foreground">
                  {[c.region, c.district, c.position, c.birth_year ? `Jg. ${c.birth_year}` : null].filter(Boolean).map((x) => ` · ${x}`).join('')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
)
