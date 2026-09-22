"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/** The .modal-backdrop viewport centers the .modal popup; a click outside the popup closes it. */
function DialogContent({
  className,
  size,
  ...props
}: DialogPrimitive.Popup.Props & { size?: "sm" | "lg" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Viewport className="modal-backdrop">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn("modal", size && `modal--${size}`, className)}
          {...props}
        />
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("display modal__title", className)}
      {...props}
    />
  )
}

function DialogDescription({ ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description data-slot="dialog-description" {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle }
