'use client'

export type InviteMode = 'single' | 'bulk'

// "One player" / "Paste several" switch of the add-invites form
export const InviteModeToggle = ({ mode, onMode }: { mode: InviteMode; onMode: (m: InviteMode) => void }) => (
  <div className="flex rounded-md border p-0.5 text-sm">
    {(['single', 'bulk'] as const).map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => onMode(m)}
        className={`rounded px-3 py-1 ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {m === 'single' ? 'One player' : 'Paste several'}
      </button>
    ))}
  </div>
)
