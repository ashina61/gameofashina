'use client'

import { useEffect, useState } from 'react'
import { asset } from '@/lib/asset'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
export function usePwa() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent) }
    const onInstall = () => { setInstalled(true); setPrompt(null) }
    const message = (event: MessageEvent) => { if (event.data === 'OFFLINE_READY') setOfflineReady(true) }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', onInstall)
    // Android paketinde (NEXT_PUBLIC_NATIVE=1) dosyalar zaten APK'nin içinde; önbellek işçisi gereksiz.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_NATIVE !== '1') {
      navigator.serviceWorker.addEventListener('message', message)
      const scope = asset('/')
      const nextStatic = asset('/_next/static/')
      const gameImages = asset('/images/game/')
      navigator.serviceWorker.register(asset('/sw.js'), { scope }).then(() => navigator.serviceWorker.ready).then(registration => {
        const urls = performance.getEntriesByType('resource').map(entry => entry.name).filter(url => {
          const parsed = new URL(url)
          return parsed.origin === location.origin &&
            (parsed.pathname.startsWith(nextStatic) || parsed.pathname.startsWith(gameImages))
        })
        registration.active?.postMessage({ type: 'CACHE_ASSETS', urls })
      }).catch(() => setOfflineReady(false))
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', onInstall)
      navigator.serviceWorker?.removeEventListener('message', message)
    }
  }, [])
  async function install() { if (!prompt) return; await prompt.prompt(); await prompt.userChoice; setPrompt(null) }
  return { install, installed, offlineReady, installAvailable: !!prompt }
}
