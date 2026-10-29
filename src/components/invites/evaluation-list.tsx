'use client'

import { COLLEGE_FIT, OUTCOMES, RATING_KEYS, RATING_LABELS, savedAtLabel, type EvaluationEntry } from '@/lib/selection-evaluation'

const outcomeLabel = (v: string) => OUTCOMES.find((o) => o.value === v)?.label ?? v
const fitLabel = (v: string) => COLLEGE_FIT.find((o) => o.value === v)?.label ?? v

// Colleagues' evaluations of one player, read-only, each with the writer's name
export const EvaluationList = ({ entries }: { entries: EvaluationEntry[] }) => (
  <ul className="space-y-2">
    {entries.map((e) => (
      <li key={e.scout} className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="flex justify-between gap-2">
          <span className="font-semibold">{e.scout}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{savedAtLabel(e.updatedAt)}</span>
        </p>
        <div className="grid grid-cols-5 gap-1 text-center">
          {RATING_KEYS.map((k) => (
            <div key={k}>
              <p className="truncate text-[11px] text-muted-foreground">{RATING_LABELS[k]}</p>
              <p className="font-bold tabular-nums">{e.note.ratings[k] ?? '-'}</p>
            </div>
          ))}
        </div>
        {e.note.observedPosition && <p><span className="text-muted-foreground">Position: </span>{e.note.observedPosition}</p>}
        {e.note.positive && <p><span className="text-muted-foreground">Stärke: </span>{e.note.positive}</p>}
        {e.note.developmentPoint && <p><span className="text-muted-foreground">Entwicklungspunkt: </span>{e.note.developmentPoint}</p>}
        {e.note.rawVoice && <p className="whitespace-pre-line"><span className="text-muted-foreground">Notizen: </span>{e.note.rawVoice}</p>}
        <p className="text-xs text-muted-foreground">
          {outcomeLabel(e.note.manualOutcome)} · College-Fußball-Niveau: {fitLabel(e.note.footballCollegeFit)}
        </p>
      </li>
    ))}
  </ul>
)
