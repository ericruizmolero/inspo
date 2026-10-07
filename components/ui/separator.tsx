"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        // The system's engraved line (components/criterio/criterio.css .cr-sep)
        orientation === "vertical" ? "cr-sep cr-sep-v" : "cr-sep",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
