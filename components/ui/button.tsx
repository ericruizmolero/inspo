import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ponytail: variants map onto the .btn classes in globals.css, which stay the single source of the look
const buttonVariants = cva("", {
  variants: {
    variant: {
      default: "btn",
      primary: "btn btn--primary",
      ghost: "btn btn--ghost",
      icon: "btn-icon",
    },
    size: {
      default: "",
      sm: "btn--sm",
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
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
