import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useSearchUsers } from '@/hooks/useUsers'
import type { PublicUser } from '@/types/api'

interface UserPickerProps {
  selected: PublicUser[]
  onChange: (users: PublicUser[]) => void
  multiple?: boolean
  placeholder?: string
}

// Name search is the only way to find another user in the MVP (no
// contacts/friends list) — see GET /users?q= added alongside this UI.
export function UserPicker({ selected, onChange, multiple = true, placeholder = 'Search by name…' }: UserPickerProps) {
  const [query, setQuery] = useState('')
  const { data: results, isFetching } = useSearchUsers(query)
  const selectedIds = new Set(selected.map((u) => u.id))

  function toggle(user: PublicUser) {
    if (selectedIds.has(user.id)) {
      onChange(selected.filter((u) => u.id !== user.id))
    } else {
      onChange(multiple ? [...selected, user] : [user])
    }
    if (!multiple) setQuery('')
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-1.5 pr-2 text-sm font-medium text-primary-700"
            >
              <Avatar src={u.avatarUrl} name={u.displayName} size="xs" />
              {u.displayName}
              <button onClick={() => toggle(u)} aria-label={`Remove ${u.displayName}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary-200"
        />
      </div>

      {query.trim().length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
          {isFetching && <p className="p-3 text-sm text-gray-400">Searching…</p>}
          {!isFetching && (results?.length ?? 0) === 0 && (
            <p className="p-3 text-sm text-gray-400">No one found</p>
          )}
          {results?.map((user) => (
            <button
              key={user.id}
              onClick={() => toggle(user)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-muted"
            >
              <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
              <span className="text-sm font-medium text-gray-800">{user.displayName}</span>
              {selectedIds.has(user.id) && <span className="ml-auto text-xs text-primary-600">Selected</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
