const LOCALE = 'pl-PL'

// number_with_precision(value, precision: 2), em dash when blank.
export function formattedOdds(value: number | null | undefined): string {
  return value != null ? value.toFixed(2) : '—'
}

// "a:b" once both results are present, otherwise an en-dash placeholder.
export function formattedScore(resultA: number | null, resultB: number | null): string {
  return resultA != null && resultB != null ? `${resultA}:${resultB}` : '–:–'
}

// 2 decimals with trailing zeros stripped (98.20 -> 98.2). Mirrors points_display.
export function pointsDisplay(value: number): string {
  return parseFloat(value.toFixed(2)).toString()
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDateLong(iso: string): string {
  // pl-PL yields a lowercase weekday ("czwartek, 4 czerwca"); capitalize just the
  // first letter so it reads as a proper label ("Czwartek, 4 czerwca"). A CSS
  // `capitalize` would wrongly upper-case the month too.
  const text = new Date(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Returns "dziś" or "jutro" when the ISO date falls on today/tomorrow (local
// time), otherwise null — lets callers render a visual badge.
export function relativeDay(iso: string): 'dziś' | 'jutro' | null {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  if (sameDay(date, today)) return 'dziś'
  if (sameDay(date, tomorrow)) return 'jutro'
  return null
}

// ISO timestamp -> value for an <input type="datetime-local"> (local wall time).
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatShort(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// Group matches by their (local) start day, preserving the incoming order — used
// for the date-separated sections in the match lists.
export function groupByDay<T extends { start: string }>(items: T[]): Array<{ start: string; items: T[] }> {
  const groups = new Map<string, { start: string; items: T[] }>()
  for (const item of items) {
    const date = new Date(item.start)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const group = groups.get(key)
    if (group) {
      group.items.push(item)
    } else {
      groups.set(key, { start: item.start, items: [item] })
    }
  }
  return Array.from(groups.values())
}
