
import { NextResponse } from 'next/server'

export async function GET() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'
    const scriptUrl = `${backendUrl}/static/embed.js`

    try {
        const response = await fetch(scriptUrl, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })

        if (!response.ok) {
            return new NextResponse(`Error fetching script: ${response.statusText}`, { status: response.status })
        }

        const scriptContent = await response.text()

        // Remplacer dynamiquement l'URL de base si nécessaire (optionnel, mais sûr)
        // Ici on s'assure que le embed.js pointe bien vers le backend pour les appels API
        // Mais on a déjà sécurisé embed.js pour utiliser l'apiUrl passée en config.

        return new NextResponse(scriptContent, {
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-cache, no-store, must-revalidate' // Éviter le cache pendant le dev
            }
        })
    } catch (error) {
        console.error('Proxy Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
