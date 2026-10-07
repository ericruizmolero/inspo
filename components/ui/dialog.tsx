"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/criterio"

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
      className={cn("t-title-m modal__title", className)}
      {...props}
    />
  )
}

function DialogDescription({ ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description data-slot="dialog-description" {...props} />
}

/** A modal in the shape of the system's TipWindow: a moss title bar with a short title and a strong xs close,
 * then the heading in display 700, the body and an optional footer (a Checkbox and/or up to two buttons).
 * Always paper and ink, in both themes. No sprite while the creature stays out. */
function DialogWindow({
  bar,
  heading,
  closeLabel,
  footer,
  className,
  children,
  ...props
}: Omit<DialogPrimitive.Popup.Props, "children"> & { bar: React.ReactNode; heading?: React.ReactNode; closeLabel: string; footer?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <DialogContent className={cn("modal--window", className)} {...props}>
      <header className="cr-window-bar modal-window__bar">
        <span className="cr-window-title">{bar}</span>
        <DialogClose render={<IconButton icon="close" label={closeLabel} variant="strong" size="xs" />} />
      </header>
      <div className="modal__body modal-window__body">
        {heading && <DialogTitle className="cr-window-heading t-title-m">{heading}</DialogTitle>}
        {children}
      </div>
      {footer && <div className="cr-window-footer modal-window__footer">{footer}</div>}
    </DialogContent>
  )
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogWindow }
