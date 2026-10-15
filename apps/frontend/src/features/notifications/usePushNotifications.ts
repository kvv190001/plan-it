import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/lib/api'

export type PushStatus = 'unsupported' | 'needs-install' | 'denied' | 'unavailable' | 'off' | 'on'

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function usePushNotifications() {
  const api = useApi()
  const [status, setStatus] = useState<PushStatus>('off')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus(isIos && !isStandalone ? 'needs-install' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') return setStatus('denied')
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    setStatus(subscription && Notification.permission === 'granted' ? 'on' : 'off')
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const publicKey = await api.push.publicKey()
      if (!publicKey) return setStatus('unavailable')

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return setStatus(permission === 'denied' ? 'denied' : 'off')

      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }))
      await api.push.subscribe(subscription.toJSON())
      setStatus('on')
    } finally {
      setBusy(false)
    }
  }, [api])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await api.push.unsubscribe(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setStatus('off')
    } finally {
      setBusy(false)
    }
  }, [api])

  return { status, busy, enable, disable }
}
