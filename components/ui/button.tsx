import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ponytail: variants map onto the .btn classes in globals.css, which stay the single source of the look
const buttonVariants = cva("", {
  variants: {
    variant: {
      default: "btn",
      primary: "btn btn--primary",
      dark: "btn btn--dark",
      danger: "btn btn--danger",
      // The system's quiet Button: no border, bevel or fill until hover. "ghost" is its old name
      quiet: "btn btn--quiet",
      ghost: "btn btn--quiet",
      // The system's IconButton, quiet and size s (a 32 circle); the label doubles as the tooltip
      icon: "btn-icon",
    },
    size: {
      // The system's sizes: m 44 (default in product), s 34 (balloons, windows, toolbars), l 52 (heroes)
      default: "",
      sm: "btn--sm",
      lg: "btn--lg",
    },
    block: {
      true: "btn--block",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Button({
  className,
  variant,
  size,
  block,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const tip = variant === "icon" && props.title === undefined ? props["aria-label"] : undefined
  return (
    <ButtonPrimitive
      data-slot="button"
      title={tip}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
