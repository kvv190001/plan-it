import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

// Offline banner + "new version available" prompt (registerType: 'prompt').
export function PwaStatus() {
  const online = useOnline()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-50 bg-gray-800 px-4 py-1.5 pt-[max(env(safe-area-inset-top),0.375rem)] text-center text-xs font-medium text-white">
          You're offline — some things may not load
        </div>
      )}
      {needRefresh && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          <span className="flex-1">A new version is available.</span>
          <button className="font-semibold text-primary-300" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
          <button className="text-gray-400" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </div>
      )}
    </>
  )
}
