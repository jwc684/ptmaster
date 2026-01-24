import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-0 bg-muted/50 h-11 w-full min-w-0 rounded-xl px-4 py-2.5 text-base transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30",
        "aria-invalid:ring-destructive/20 aria-invalid:bg-red-50 dark:aria-invalid:bg-red-950/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
