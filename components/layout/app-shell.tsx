"use client"

import { useState } from "react"
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

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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

function Navigation({ activeTab }: { activeTab: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const currentModule = MODULES.find((m) => m.id === activeTab) ?? MODULES[0]

  return (
    <aside className="sidebar-pill flex shrink-0 flex-col gap-2.5 rounded-2xl border border-border-subtle/80 bg-surface-1/50 p-3 backdrop-blur-md sm:p-4 lg:w-56 lg:gap-0 lg:overflow-y-auto lg:rounded-2xl lg:border-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:px-5 lg:py-6">
      {/* Brand, Active Module Badge & Mobile Controls */}
      <div className="flex items-center justify-between px-1 lg:block lg:px-3 lg:pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-headline font-bold tracking-tight sm:text-title">RFForge</span>
          <span className="rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary lg:hidden">
            {currentModule.label}
          </span>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border-subtle bg-surface-1 text-text-secondary transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {menuOpen ? <CloseIcon className="size-4" /> : <MenuIcon className="size-4" />}
          </button>
        </div>
      </div>

      {/* Tabs navigation list — collapsed on mobile unless opened, always visible on desktop */}
      <div className={cn("overflow-hidden transition-all duration-200 lg:overflow-visible", menuOpen ? "block" : "hidden lg:block")}>
        <TabsList variant="line" className="flex w-full flex-col gap-1 bg-transparent p-0 pt-1 lg:pt-0">
          {MODULES.map((m) => (
            <TabsTrigger
              key={m.id}
              value={m.id}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "relative h-10 w-full justify-start rounded-lg px-3.5 text-caption font-medium text-text-secondary transition-colors sm:px-4 lg:h-9",
                "hover:bg-muted/60 hover:text-foreground",
                "after:hidden after:opacity-0!",
                "data-active:bg-muted! data-active:text-foreground! data-active:font-semibold"
              )}
            >
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Desktop theme toggle */}
      <div className="mt-auto hidden items-center justify-end px-3 pt-4 lg:flex">
        <ThemeToggle />
      </div>
    </aside>
  )
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<string>("c")

  return (
    <ResultsProvider>
      <div className="flex min-h-screen items-stretch justify-center bg-background p-2.5 text-foreground sm:p-4 lg:gap-5 lg:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            if (val) setActiveTab(val)
          }}
          defaultValue="c"
          orientation="vertical"
          className="flex w-full flex-col gap-3 sm:gap-4 lg:h-[calc(100vh-3rem)] lg:flex-row lg:gap-5"
        >
          <Navigation activeTab={activeTab} />

          <div className="dashboard-panel min-w-0 flex-1 overflow-y-auto p-3.5 sm:p-6 lg:px-9 lg:py-8">
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
