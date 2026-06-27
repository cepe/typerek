import { useEffect, useRef, useState } from 'react'

// A horizontal touch swipe between an ordered list of in-page tabs: swipe left →
// next tab, swipe right → previous, clamped at both ends (no wrap). The visible
// tab buttons stay the primary control; this gesture is purely additive. Used on
// the Matches page (Aktualne / Zakończone).

// A swipe must travel at least this far horizontally, beat the vertical travel by
// this ratio (so a mostly-vertical scroll never switches tabs), and finish within
// this time — a quick flick, not a slow drag or a text selection.
const MIN_DISTANCE = 60
const HORIZONTAL_RATIO = 1.4
const MAX_DURATION = 700

// The direction the incoming tab slides in from, used to pick the enter animation.
// 'right' when we moved forward (swipe left), 'left' when back.
export type SwipeDir = 'left' | 'right'

// Should this gesture be left alone? True when it starts on a form control (taps /
// text selection) or inside something that can itself scroll horizontally — that
// content owns the gesture, not the tab switcher.
function shouldIgnore(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== document.body) {
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable) {
      return true
    }
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

// Touch-driven switching between a page's tabs. Pass the ordered tab values, the
// current value and a setter; returns the slide direction and a key that changes on
// each swipe, so the consumer can replay the enter animation only on swipes (a tab
// click leaves the key alone).
export function useSwipeTabs<T extends string>(
  values: readonly T[],
  current: T,
  onChange: (next: T) => void,
): { dir: SwipeDir | null; navKey: number } {
  // Keep the latest props reachable from the once-attached listeners without
  // re-subscribing on every tab change.
  const ref = useRef({ values, current, onChange })
  ref.current = { values, current, onChange }

  const [state, setState] = useState<{ dir: SwipeDir | null; navKey: number }>({ dir: null, navKey: 0 })

  useEffect(() => {
    let startX = 0
    let startY = 0
    let startT = 0
    let active = false

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || shouldIgnore(event.target)) {
        active = false
        return
      }
      const touch = event.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      startT = Date.now()
      active = true
    }

    const onEnd = (event: TouchEvent) => {
      if (!active) return
      active = false
      const { values, current, onChange } = ref.current
      const index = values.indexOf(current)
      if (index === -1) return
      const touch = event.changedTouches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (Date.now() - startT > MAX_DURATION) return
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return
      const next = index + (dx < 0 ? 1 : -1)
      if (next < 0 || next >= values.length) return
      setState((prev) => ({ dir: dx < 0 ? 'right' : 'left', navKey: prev.navKey + 1 }))
      onChange(values[next])
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])

  return state
}
