// Branded top header for the top-level tab screens (chats/plans/activity/
// profile) — replaces per-page titles with consistent app branding.
export function AppHeader() {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-surface-muted/95 px-4 py-4 backdrop-blur">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight text-primary-600">
        Plan it
      </h1>
    </div>
  )
}
