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

/** A window: the flat modal's header (the title in title-s and a default s close, no moss bar: Eric, 06-11),
 * the body and an optional footer (a Checkbox and/or up to two buttons). */
function DialogWindow({
  heading,
  closeLabel,
  footer,
  className,
  children,
  ...props
}: Omit<DialogPrimitive.Popup.Props, "children"> & { heading: React.ReactNode; closeLabel: string; footer?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <DialogContent className={cn("modal--window", className)} {...props}>
      <header className="modal__header">
        <DialogTitle className="t-title-s">{heading}</DialogTitle>
        <DialogClose render={<IconButton icon="close" label={closeLabel} variant="default" size="s" />} />
      </header>
      <div className="modal__body modal-window__body">{children}</div>
      {footer && <div className="cr-window-footer modal-window__footer">{footer}</div>}
    </DialogContent>
  )
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogWindow }
