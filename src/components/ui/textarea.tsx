import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-0 bg-muted/50 placeholder:text-muted-foreground focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 aria-invalid:bg-red-50 dark:aria-invalid:bg-red-950/20 flex field-sizing-content min-h-20 w-full rounded-xl px-4 py-3 text-base transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
