import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconButton } from './IconButton'

// A page header's back button should return wherever the user actually came
// from (e.g. the chats list, if they tapped an Active Plan card there) rather
// than a hardcoded parent route. `location.key === 'default'` means there's
// no in-app history to go back to (direct link/refresh), so we fall back to
// a sensible default route in that case instead of navigating out of the app.
export function BackButton({ fallbackTo }: { fallbackTo: string }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <IconButton
      aria-label="Go back"
      onClick={() => (location.key === 'default' ? navigate(fallbackTo) : navigate(-1))}
    >
      <ChevronLeft className="size-5" />
    </IconButton>
  )
}
