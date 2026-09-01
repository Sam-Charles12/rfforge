"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModuleA } from "@/components/modules/module-a"
import { ModuleB } from "@/components/modules/module-b"
import { ModuleC } from "@/components/modules/module-c"
import { ModuleD } from "@/components/modules/module-d"
import { ResultsProvider } from "@/components/engine/results-provider"
import { useTheme } from "@/components/theme/theme-provider"
import { cn } from "@/lib/utils"

const MODULES = [
  { id: "a", label: "Matching" },
  { id: "b", label: "PA Performance" },
  { id: "c", label: "Frequency Scaling" },
  { id: "d", label: "AI Layer" },
] as const

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === "dark"
  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-transparent text-text-secondary transition-colors hover:border-[var(--glass-border)] hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <SunIcon className={cn("size-4 transition-opacity", dark ? "opacity-100" : "opacity-0 absolute")} />
      <MoonIcon className={cn("size-4 transition-opacity", dark ? "opacity-0 absolute" : "opacity-100")} />
    </button>
  )
}

function SidebarNav() {
  return (
    <aside className="sidebar-pill flex w-56 shrink-0 flex-col overflow-y-auto px-5 py-6">
      <span className="px-3 pb-4 font-mono text-title font-bold tracking-tight">RFForge</span>

      <TabsList variant="line" className="w-full gap-1 bg-transparent">
        {MODULES.map((m) => (
          <TabsTrigger
            key={m.id}
            value={m.id}
            className={cn(
              "relative h-9 justify-start rounded-lg px-4 text-caption font-medium text-text-secondary transition-colors",
              "hover:bg-muted/60 hover:text-foreground",
              "after:hidden after:opacity-0!",
              "data-active:bg-muted! data-active:text-foreground! data-active:font-semibold"
            )}
          >
            {m.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-auto flex items-center justify-end px-3 pt-4">
        <ThemeToggle />
      </div>
    </aside>
  )
}

export function AppShell() {
  return (
    <ResultsProvider>
      <div className="flex min-h-screen items-stretch justify-center bg-background gap-4 p-4 text-foreground lg:gap-5 lg:p-6">
        <Tabs
          defaultValue="c"
          orientation="vertical"
          className="flex h-[calc(100vh-2rem)] w-full gap-4 lg:h-[calc(100vh-3rem)] lg:gap-5"
        >
          <SidebarNav />

          <div className="dashboard-panel min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-9 lg:py-8">
            <TabsContent value="a">
              <ModuleA />
            </TabsContent>

            <TabsContent value="b">
              <ModuleB />
            </TabsContent>

            <TabsContent value="c">
              <ModuleC />
            </TabsContent>

            <TabsContent value="d">
              <ModuleD />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ResultsProvider>
  )
}
