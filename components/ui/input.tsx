import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({
  className,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & { size?: "default" | "lg" }) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn("input", size === "lg" && "input--lg", className)}
      {...props}
    />
  )
}

export { Input }
