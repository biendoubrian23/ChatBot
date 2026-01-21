import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header simple */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-xl">MONITORA</span>
          </Link>
        </div>
      </header>

      {/* Contenu centré */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </main>

      {/* Footer simple */}
      <footer className="border-t border-border py-4">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-gray-500">
          © 2026 MONITORA - BiendouCorp
        </div>
      </footer>
    </div>
  )
}
