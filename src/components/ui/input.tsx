import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 bg-transparent px-4 py-3 text-base font-mono transition-all outline-none",
        "border-0 border-b-2 border-b-primary rounded-none",
        "placeholder:text-[var(--counter-ash)] placeholder:italic",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "selection:bg-accent selection:text-accent-foreground",
        "focus-visible:border-b-accent focus-visible:shadow-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-b-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
