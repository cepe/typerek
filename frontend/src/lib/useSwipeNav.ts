import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// The swipeable top-level pages, in left-to-right order. A horizontal swipe moves
// to the neighbouring page: swipe left → next (Ranking), swipe right → previous
// (Mecze). Keep this in sync with the nav order in Layout.
const PAGES = ['/matches', '/ranking'] as const
type Page = (typeof PAGES)[number]

// A swipe must travel at least this far horizontally, beat the vertical travel by
// this ratio (so a mostly-vertical scroll never navigates), and finish within this
// time — a quick flick, not a slow drag or a text selection.
const MIN_DISTANCE = 60
const HORIZONTAL_RATIO = 1.4
const MAX_DURATION = 700

// The direction the incoming page slides in from, used to pick the enter
// animation. 'right' when we moved forward (swipe left), 'left' when back.
export type SwipeDir = 'left' | 'right'

// Should this gesture be left alone? True when it starts on a form control (taps /
// text selection) or inside something that can itself scroll horizontally (the
// ranking charts) — that content owns the gesture, not the page switcher.
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

// Touch-driven navigation between the matches and ranking pages. Returns the slide
// direction and a key that changes on each swipe; Layout uses the key to replay the
// enter animation only on swipes (a normal click navigation leaves the key alone).
export function useSwipeNav(): { dir: SwipeDir | null; navKey: number } {
  const navigate = useNavigate()
  const location = useLocation()
  // Read the live path inside the once-attached listeners without re-subscribing on
  // every navigation.
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  const [state, setState] = useState<{ dir: SwipeDir | null; navKey: number }>({ dir: null, navKey: 0 })

  useEffect(() => {
    let startX = 0
    let startY = 0
    let startT = 0
    let active = false

    const onStart = (event: TouchEvent) => {
      const index = PAGES.indexOf(pathRef.current as Page)
      if (index === -1 || event.touches.length !== 1 || shouldIgnore(event.target)) {
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
      const index = PAGES.indexOf(pathRef.current as Page)
      if (index === -1) return
      const touch = event.changedTouches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (Date.now() - startT > MAX_DURATION) return
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return
      const next = index + (dx < 0 ? 1 : -1)
      if (next < 0 || next >= PAGES.length) return
      setState((prev) => ({ dir: dx < 0 ? 'right' : 'left', navKey: prev.navKey + 1 }))
      navigate(PAGES[next])
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [navigate])

  return state
}
