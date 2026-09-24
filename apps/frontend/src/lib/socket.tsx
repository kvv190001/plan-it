import { useAuth } from '@clerk/react'
import { SOCKET_EVENTS } from '@plan-it/shared'
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL

const SocketContext = createContext<Socket | null>(null)

// One Socket.io connection for the whole app, established once the user is
// signed in. Token is re-fetched on every (re)connection attempt via the
// `auth` callback, since Clerk session tokens are short-lived.
export function SocketProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  useEffect(() => {
    if (!isSignedIn) {
      setSocket(null)
      return
    }

    const instance = io(API_URL, {
      autoConnect: true,
      auth: (cb) => {
        getTokenRef.current().then((token) => cb({ token }))
      },
    })
    setSocket(instance)

    return () => {
      instance.disconnect()
    }
  }, [isSignedIn])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}

// Subscribes to a socket event for the lifetime of the component; safe to
// call even before the socket has connected (subscribes once it exists).
export function useSocketEvent<T = unknown>(event: (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS], handler: (payload: T) => void) {
  const socket = useSocket()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!socket) return
    const listener = (payload: T) => handlerRef.current(payload)
    socket.on(event, listener)
    return () => {
      socket.off(event, listener)
    }
  }, [socket, event])
}
