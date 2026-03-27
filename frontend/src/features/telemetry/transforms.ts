export type WindowKey = '2h' | 'today' | '7d'

const WINDOW_TO_MS: Partial<Record<WindowKey, number>> = {
  '2h': 2 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

export type HasTimestamp = {
  timestamp: string
}

export const parseTimestamp = (iso: string): number => Date.parse(iso)

export const sortByTimestamp = <T extends HasTimestamp>(items: T[]): T[] =>
  [...items].sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp))

export const filterToday = <T extends HasTimestamp>(items: T[]): T[] => {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const cutoff = midnight.getTime()
  return items.filter((i) => parseTimestamp(i.timestamp) >= cutoff)
}

export const filterByWindow = <T extends HasTimestamp>(items: T[], windowKey: WindowKey): T[] => {
  if (!items.length) {
    return items
  }

  if (windowKey === 'today') {
    return filterToday(items)
  }

  const ms = WINDOW_TO_MS[windowKey]!
  const reference = parseTimestamp(items[items.length - 1]?.timestamp)
  const threshold = reference - ms

  return items.filter((item) => parseTimestamp(item.timestamp) >= threshold)
}

export const bucketByMinute = <T extends HasTimestamp>(
  items: T[],
  pick: (item: T) => number,
): Array<{ timestamp: number; value: number }> => {
  const buckets = new Map<number, number[]>()

  items.forEach((item) => {
    const date = new Date(item.timestamp)
    date.setSeconds(0, 0)
    const key = date.getTime()
    const value = pick(item)
    const bucket = buckets.get(key)
    if (!bucket) {
      buckets.set(key, [value])
    } else {
      bucket.push(value)
    }
  })

  return Array.from(buckets.entries())
    .map(([timestamp, values]) => ({
      timestamp,
      value: values.reduce((acc, value) => acc + value, 0) / values.length,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}
