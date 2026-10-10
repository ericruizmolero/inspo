"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"
import "@/components/criterio/criterio.css"

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="cr-tip-pos"
      >
        {/* The system's tooltip: a small butter Balloon (components/criterio/criterio.css .cr-tip) */}
        <TooltipPrimitive.Popup data-slot="tooltip-content" className={cn("cr-tip", className)} {...props}>
          {children}
          <TooltipPrimitive.Arrow className="cr-tip-arrow" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent }
