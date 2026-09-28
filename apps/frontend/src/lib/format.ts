export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDayHeading(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  if (isToday) return 'Today'
  if (isTomorrow) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

// Day divider heading for message history (always in the past): Today,
// Yesterday, or the weekday name — never a numeric date, per chat UX.
export function formatMessageDayHeading(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Timestamp shown above a group of messages, e.g. "Today at 2:18 PM" or
// "Thursday, Sep 25 at 3:00 PM".
export function formatMessageTimestamp(iso: string): string {
  const date = new Date(iso)
  const time = formatMessageTime(iso)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return `Today at ${time}`
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`
  const dayPart = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  return `${dayPart} at ${time}`
}

// Compact date/time label for the active-plan cards on the chats page, e.g.
// "Today, 7:00 PM" or "Fri, 7:00 PM".
export function formatEventCardTime(iso: string): string {
  const date = new Date(iso)
  const time = formatMessageTime(iso)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`
  const dayPart = date.toLocaleDateString(undefined, { weekday: 'short' })
  return `${dayPart}, ${time}`
}

// Compact target-date label for goal cards on the chats page, e.g. "Target
// today" or "Target Nov 15".
export function formatGoalTargetDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Target today'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'Target tomorrow'
  const datePart = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `Target ${datePart}`
}
