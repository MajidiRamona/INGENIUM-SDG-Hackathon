import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ImpactScout',
  description: 'AI-powered SDG deal flow intelligence',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
