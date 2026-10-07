import { cn } from "@/lib/utils"

// The app's skeleton slot (.sk in globals.css): the same shimmer as every loading.tsx
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("sk", className)}
      {...props}
    />
  )
}

export { Skeleton }
