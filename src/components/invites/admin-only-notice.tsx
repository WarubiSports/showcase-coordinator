'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Shown when the middleware sent a staff user here from an admin-only page (dashboard, players, settings)
const Notice = () => {
  const notice = useSearchParams().get('notice')
  if (notice !== 'admin-only') return null
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Dieser Bereich ist nur mit dem Admin-Login erreichbar.
    </div>
  )
}

export const AdminOnlyNotice = () => (
  <Suspense fallback={null}>
    <Notice />
  </Suspense>
)
