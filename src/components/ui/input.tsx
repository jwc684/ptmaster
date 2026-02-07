import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border border-input bg-transparent h-10 w-full min-w-0 rounded-none px-4 py-2 text-base transition-colors duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-primary focus-visible:ring-0",
        "aria-invalid:border-destructive aria-invalid:bg-red-50 dark:aria-invalid:bg-red-950/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
