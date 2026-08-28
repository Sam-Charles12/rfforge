"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModuleA } from "@/components/modules/module-a"
import { ModuleB } from "@/components/modules/module-b"
import { ModuleC } from "@/components/modules/module-c"
import { ModulePlaceholder } from "@/components/modules/module-placeholder"
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-text-secondary transition-colors hover:border-[var(--glass-border)] hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <SunIcon className={cn("size-4 transition-opacity", dark ? "opacity-100" : "opacity-0 absolute")} />
      <MoonIcon className={cn("size-4 transition-opacity", dark ? "opacity-0 absolute" : "opacity-100")} />
    </button>
  )
}

function SidebarNav() {
  return (
    <div className="sticky top-0 flex h-screen flex-col items-start gap-6 px-4 py-6">
      <div className="glass-elevated flex h-full w-52 flex-col rounded-2xl px-3 py-5">
        <span className="px-2 pb-5 font-mono text-title font-bold tracking-tight">RFForge</span>

        <TabsList variant="line" className="w-full gap-1 bg-transparent">
          {MODULES.map((m) => (
            <TabsTrigger
              key={m.id}
              value={m.id}
              className={cn(
                "h-9 rounded-lg px-3 text-caption font-medium text-text-secondary hover:text-foreground data-active:text-foreground"
              )}
            >
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-auto flex items-center justify-between px-2 pt-4">
          <span className="text-micro text-text-tertiary">C · Phase 3</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

export function AppShell() {
  return (
    <Tabs
      defaultValue="c"
      orientation="vertical"
      className="flex min-h-screen gap-4 bg-background text-foreground"
    >
      <SidebarNav />

      <main className="min-w-0 flex-1 px-6 pt-6 pb-16">
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
          <ModulePlaceholder
            code="D"
            title="AI Explanation Layer"
            accentClass="accent-bg-ai"
            description="Plain-language engineering commentary on calculated results. Read-only relative to the calculation modules."
          />
        </TabsContent>
      </main>
    </Tabs>
  )
}
