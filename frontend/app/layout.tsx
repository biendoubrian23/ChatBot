import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LibriAssist - Assistant CoolLibri',
  description: 'Votre assistant intelligent pour CoolLibri',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
