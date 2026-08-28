import { Switch } from "@base-ui/react/switch"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * A real on/off switch (Base UI primitives), matching the design system's
 * primitive pattern (Tabs, Button, etc.). Used for the Module D AI-layer
 * toggle (FR-D5). Glows `--accent-ai` purple when active per design.md.
 */
function Toggle({ className, ...props }: ComponentProps<typeof Switch.Root>) {
  return (
    <Switch.Root
      data-slot="toggle"
      className={cn(
        "group inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input shadow-sm transition-colors outline-none select-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-checked:bg-[var(--accent-ai)]",
        className
      )}
      {...props}
    >
      <span
        data-slot="toggle-thumb"
        className={cn(
          "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform",
          "group-data-checked:translate-x-[18px]"
        )}
      />
    </Switch.Root>
  )
}

export { Toggle }
