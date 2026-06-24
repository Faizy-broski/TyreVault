'use client'

import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Next.js throws this when a Server Action ID from a previous build is called
    // against a newer deployment. Force a full reload to pick up the new build.
    if (error.message?.includes('older or newer deployment')) {
      window.location.reload()
    }
  }, [error])

  return (
    <html>
      <body>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h2>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '0.5rem 1.5rem', background: '#facc15', borderRadius: '0.5rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
