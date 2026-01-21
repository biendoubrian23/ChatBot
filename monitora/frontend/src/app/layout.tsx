import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MONITORA - Plateforme de Gestion de Chatbots',
  description: 'Déployez et gérez vos chatbots IA depuis une interface centralisée',
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
