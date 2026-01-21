
import { NextResponse } from 'next/server'

export async function GET() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'
    const scriptUrl = `${backendUrl}/static/embed.js`

    console.log('[Proxy] Attempting to fetch script from:', scriptUrl) // <-- DEBUG LOG

    try {
        const response = await fetch(scriptUrl, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })

        if (!response.ok) {
            console.error(`[Proxy] Failed to fetch script. Status: ${response.status} ${response.statusText}`) // <-- DEBUG LOG
            return new NextResponse(`Error fetching script: ${response.statusText} at ${scriptUrl}`, { status: response.status })
        }

        const scriptContent = await response.text()
        console.log('[Proxy] Successfully fetched script. Length:', scriptContent.length) // <-- DEBUG LOG

        return new NextResponse(scriptContent, {
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        })
    } catch (error) {
        console.error('[Proxy] Internal Error:', error) // <-- DEBUG LOG
        return new NextResponse(`Internal Server Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 })
    }
}
