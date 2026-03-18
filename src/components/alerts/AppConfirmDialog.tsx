import { useEffect } from "react"

import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"

export type AppConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export type AppConfirmDialogState = {
  open: boolean
  options: AppConfirmOptions | null
  isWorking?: boolean
}

type Props = {
  state: AppConfirmDialogState
  onCancel: () => void
  onConfirm: () => void
}

export function AppConfirmDialog({ state, onCancel, onConfirm }: Props) {
  const { open, options, isWorking } = state

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onCancel() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-slate-300 bg-white p-5 shadow-lg">
          <Dialog.Title className="text-sm font-semibold text-slate-900">
            {options?.title ?? "Confirm"}
          </Dialog.Title>
          {options?.description ? (
            <Dialog.Description className="mt-2 text-xs leading-relaxed text-slate-700">
              {options.description}
            </Dialog.Description>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              onClick={onCancel}
              disabled={isWorking}
            >
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant={options?.destructive ? "destructive" : "default"}
              size="sm"
              className={options?.destructive ? "bg-red-600 hover:bg-red-700 text-white" : undefined}
              onClick={onConfirm}
              disabled={isWorking}
            >
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

