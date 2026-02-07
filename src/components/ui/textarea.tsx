import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-0 aria-invalid:border-destructive aria-invalid:bg-red-50 dark:aria-invalid:bg-red-950/20 flex field-sizing-content min-h-20 w-full rounded-none px-4 py-3 text-base transition-colors duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
