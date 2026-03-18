import * as React from "react"

import { Toaster } from "@/components/ui/toaster"
import { AppConfirmDialog, type AppConfirmOptions, type AppConfirmDialogState } from "@/components/alerts/AppConfirmDialog"
import { toast, type ToastInput } from "@/hooks/use-toast"

type ConfirmFn = (options: AppConfirmOptions) => Promise<boolean>

type AppAlertContextValue = {
  toast: (input: ToastInput) => { id: string; dismiss: () => void }
  confirm: ConfirmFn
}

const AppAlertContext = React.createContext<AppAlertContextValue | null>(null)

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)
  const [confirmState, setConfirmState] = React.useState<AppConfirmDialogState>({
    open: false,
    options: null,
    isWorking: false,
  })

  const confirm: ConfirmFn = React.useCallback(async (options) => {
    if (confirmState.open) return false

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setConfirmState({ open: true, options, isWorking: false })
    })
  }, [confirmState.open])

  const closeConfirm = React.useCallback((result: boolean) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setConfirmState({ open: false, options: null, isWorking: false })
  }, [])

  const value = React.useMemo<AppAlertContextValue>(
    () => ({
      toast,
      confirm,
    }),
    [confirm],
  )

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <Toaster />
      <AppConfirmDialog
        state={confirmState}
        onCancel={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
      />
    </AppAlertContext.Provider>
  )
}

export function useAppAlertContext() {
  const ctx = React.useContext(AppAlertContext)
  if (!ctx) throw new Error("useAppAlert must be used within <AppAlertProvider>")
  return ctx
}

