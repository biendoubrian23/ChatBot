'use client'

import { useState, useRef, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950">
      <ChatInterface />
    </main>
  )
}
