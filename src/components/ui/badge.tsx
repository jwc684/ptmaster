import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border-0 px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-[#fff1f1] text-[#da1e28] dark:bg-[#750e13]/30 dark:text-[#ff8389]",
        outline:
          "border border-border bg-background text-foreground",
        success:
          "bg-[#defbe6] text-[#198038] dark:bg-[#198038]/30 dark:text-[#6fdc8c]",
        warning:
          "bg-[#fdf6dd] text-[#8e6a00] dark:bg-[#8e6a00]/30 dark:text-[#f1c21b]",
        info:
          "bg-[#edf5ff] text-[#0043ce] dark:bg-[#0043ce]/30 dark:text-[#78a9ff]",
        muted:
          "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
