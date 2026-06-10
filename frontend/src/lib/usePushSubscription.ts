import { useCallback } from 'react'
import api from '@/api/client'

// Public VAPID key (URL-safe base64), injected at build time. Without it the browser
// can't subscribe, so push simply stays unavailable.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// Whether this browser can do Web Push at all. On iOS this is only true for a PWA
// added to the home screen (iOS 16.4+), not a regular Safari tab.
export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY
  )
}

// applicationServerKey travels as URL-safe base64 and must be decoded to bytes.
// Typed as BufferSource (what PushManager.subscribe's applicationServerKey expects).
function urlBase64ToBytes(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function usePushSubscription() {
  // Ask for permission, subscribe this device, and register it with the backend.
  // Resolves true only when the device is fully subscribed; false if unsupported or
  // the user denied permission (the caller then leaves the opt-in switched off).
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!pushSupported()) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(VAPID_PUBLIC_KEY as string),
      }))

    await api.post('/push/subscriptions', {
      subscription: subscription.toJSON(),
      user_agent: navigator.userAgent,
    })
    return true
  }, [])

  // Remove this device's subscription from the backend and the browser.
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!pushSupported()) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await api.delete('/push/subscriptions', { endpoint: subscription.endpoint }).catch(() => undefined)
    await subscription.unsubscribe().catch(() => undefined)
  }, [])

  return { subscribe, unsubscribe }
}
