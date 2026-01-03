import { createContext, useContext, useState, useCallback } from 'react'
import Toast from './Toast'

const ToastContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now().toString()
    const newToast = {
      id,
      type: toast.type || 'info',
      title: toast.title,
      message: toast.message,
      duration: toast.duration !== undefined ? toast.duration : 5000,
    }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (options) => {
      return addToast(options)
    },
    [addToast]
  )

  const toastSuccess = useCallback(
    (message, title = 'Success') => {
      return addToast({ type: 'success', title, message })
    },
    [addToast]
  )

  const toastError = useCallback(
    (message, title = 'Error') => {
      return addToast({ type: 'error', title, message })
    },
    [addToast]
  )

  const toastWarning = useCallback(
    (message, title = 'Warning') => {
      return addToast({ type: 'warning', title, message })
    },
    [addToast]
  )

  const toastInfo = useCallback(
    (message, title = 'Info') => {
      return addToast({ type: 'info', title, message })
    },
    [addToast]
  )

  return (
    <ToastContext.Provider
      value={{
        toast,
        toastSuccess,
        toastError,
        toastWarning,
        toastInfo,
        removeToast,
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

