"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// cmdk parts dressed with the project's classes (.cmdk-*), inside the app's own Dialog.

function CommandDialog({ title, open, onOpenChange, children }: {
  title: string; open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cmdk-dialog">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <CommandPrimitive className="cmdk" loop>{children}</CommandPrimitive>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, icon, ...props }: React.ComponentProps<typeof CommandPrimitive.Input> & { icon?: React.ReactNode }) {
  return (
    <div className="cmdk-input">
      {icon}
      <CommandPrimitive.Input className={cn("cmdk-input__field", className)} {...props} />
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className={cn("cmdk-list", className)} {...props} />
}

function CommandEmpty(props: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className="cmdk-empty" {...props} />
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return <CommandPrimitive.Group className={cn("cmdk-group", className)} {...props} />
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item className={cn("cmdk-item", className)} {...props} />
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("cmdk-item__hint", className)} {...props} />
}

export { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut }
