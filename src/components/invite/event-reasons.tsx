import { GraduationCap, Play, Trophy, Video } from 'lucide-react'
import { REASONS } from '@/lib/event-page'

const ICONS = [Trophy, Video, GraduationCap] as const

// Three reasons in one line each, and the reel button when the event description carries a "Video:" line
export const EventReasons = ({ videoUrl }: { videoUrl: string | null }) => (
  <div className="space-y-3">
    <ul className="space-y-2">
      {REASONS.map((text, i) => {
        const Icon = ICONS[i]
        return (
          <li key={text} className="flex items-start gap-3 text-sm text-ausa-ink-700">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ausa-accent" />
            <span>{text}</span>
          </li>
        )
      })}
    </ul>
    {videoUrl && (
      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-ausa-ink-900 px-3 py-1.5 text-sm font-semibold text-ausa-ink-900">
        <Play className="h-4 w-4" />
        So sieht das aus
      </a>
    )}
  </div>
)
