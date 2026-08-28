"use client"

import { useCallback, useContext, useEffect, useMemo, useSyncExternalStore, createContext } from "react"

const STORAGE_KEY = "rfforge-theme"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

let explicit: Theme | null =
  typeof window !== "undefined"
    ? (() => {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        return stored === "light" || stored === "dark" ? stored : null
      })()
    : null

const listeners = new Set<() => void>()

function systemPref(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const mq = window.matchMedia("(prefers-color-scheme: light)")
  const handler = () => emit()
  mq.addEventListener("change", handler)
  return () => {
    listeners.delete(cb)
    mq.removeEventListener("change", handler)
  }
}

function getSnapshot(): Theme {
  return explicit ?? systemPref()
}

function getServerSnapshot(): Theme {
  return "dark"
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}

function setTheme(t: Theme) {
  explicit = t
  window.localStorage.setItem(STORAGE_KEY, t)
  apply(t)
  emit()
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    apply(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>")
  return ctx
}
