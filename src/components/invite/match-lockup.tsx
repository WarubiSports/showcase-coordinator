import Image from 'next/image'

// The match as two logos: Athletes USA on the left, the 1. FC Köln Football School on the right. Partner
// and licensee materials carry the Football School logo, never the plain club crest (Max, 01.10). Both at
// the same height on the light card; the file is used as delivered, no recolouring.
export const MatchLockup = ({ size = 'md', className = '' }: { size?: 'md' | 'lg'; className?: string }) => {
  const h = size === 'lg' ? 'h-16 w-auto' : 'h-11 w-auto'
  return (
    <div className={`flex items-center justify-center gap-5 ${className}`}>
      <Image src="/logo-ausa.png" alt="Athletes USA" width={1235} height={608} className={h} />
      <span className="text-sm font-semibold text-ausa-ink-500">vs.</span>
      <Image src="/events/808/fc-koeln-football-school.png" alt="1. FC Köln Football School" width={868} height={520} className={h} />
    </div>
  )
}
