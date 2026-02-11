import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap font-mono text-sm font-bold uppercase tracking-wider transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 border-2 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground border-primary shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-0 active:translate-y-0 active:shadow-brutal-sm",
        destructive:
          "bg-destructive text-white border-destructive hover:bg-destructive/90",
        outline:
          "border-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        secondary:
          "bg-transparent text-primary border-primary hover:bg-primary hover:text-primary-foreground",
        ghost:
          "border-transparent border-b-primary bg-transparent px-0 hover:text-[var(--counter-yellow-dark)] hover:border-b-[var(--counter-yellow-dark)]",
        link:
          "border-transparent text-primary underline-offset-4 hover:underline px-0",
        inverse:
          "bg-background text-foreground border-background hover:bg-accent hover:border-accent",
        highlight:
          "bg-highlight text-highlight-foreground border-primary shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg",
      },
      size: {
        default: "h-10 px-8 py-4",
        sm: "h-8 px-4 py-2 text-sm",
        lg: "h-12 px-10 py-5 text-xl",
        xl: "h-14 px-12 py-6 text-xl",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
