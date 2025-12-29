import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Parallel Monitor - LibriAssist',
  description: 'Monitoring du parallélisme et des ressources système',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  )
}
