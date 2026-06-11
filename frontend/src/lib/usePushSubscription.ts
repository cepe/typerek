import { useCallback, useEffect } from 'react'
import api from '@/api/client'
import { useAuth } from '@/auth/AuthContext'

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

  // Whether *this* device currently holds a push subscription — the source of truth
  // for the per-device toggle state.
  const isSubscribed = useCallback(async (): Promise<boolean> => {
    if (!pushSupported()) return false
    const registration = await navigator.serviceWorker.ready
    return (await registration.pushManager.getSubscription()) !== null
  }, [])

  return { subscribe, unsubscribe, isSubscribed }
}

// On app load, if this device already granted permission and holds a subscription,
// re-register it with the backend. This handles push endpoint rotation and makes sure
// the device stays known to the server (and the account's push_enabled flag stays on).
// It never prompts — silent permission requests aren't allowed, so a brand-new device
// still opts in explicitly via the settings toggle.
export function usePushSync(): void {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !pushSupported() || Notification.permission !== 'granted') return

    void (async () => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return

      await api
        .post('/push/subscriptions', {
          subscription: subscription.toJSON(),
          user_agent: navigator.userAgent,
        })
        .catch(() => undefined)
    })()
  }, [isAuthenticated])
}
