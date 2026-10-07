"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Same frame as Dialog (.modal-backdrop viewport, .modal popup). An alert dialog does not close on an
// outside click: the person has to answer.
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

/** The window shape (like DialogWindow): a moss bar with a short title, then the question and the answers.
 *  No close in the bar: an alert has to be answered. */
function AlertDialogContent({ className, bar, children, ...props }: AlertDialogPrimitive.Popup.Props & { bar?: React.ReactNode }) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Viewport className="modal-backdrop">
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={cn("modal modal--window modal--confirm", className)}
          {...props}
        >
          {bar != null && <header className="cr-window-bar modal-window__bar"><span className="cr-window-title">{bar}</span></header>}
          <div className="modal__body modal-window__body">{children as React.ReactNode}</div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("cr-window-heading t-title-m confirm__title", className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("confirm__text", className)} {...props} />
}

// Both at the system's size s ("sm" in this older Button): the footer of a window (design system, Tallas)
function AlertDialogCancel({ ...props }: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" render={<Button size="sm" />} {...props} />
}

function AlertDialogAction({ ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" variant="primary" size="sm" {...props} />
}

export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle }
