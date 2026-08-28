/**
 * RFForge — Module D shared live-results store.
 *
 * A module-level external store that the individual modules (A/B/C) publish
 * their computed results to, and Module D (AI layer) reads from across module
 * boundaries. If a module hasn't published yet, fall back to the mock data
 * layer so the AI layer always has data to work with.
 *
 * Uses useSyncExternalStore (same pattern as the theme provider) so module
 * writes from effects/renders never trip the set-state-in-effect lint rule.
 */
"use client"

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, useEffect } from "react"
import type { ReactNode } from "react"
import type { RfResult, ResultSource } from "@/types/rf-results"
import { buildMatchingResult, buildPAResult, buildScaleResult } from "@/types/rf-results"
import { getMockResult } from "@/lib/ai/mock-results"
import type { MatchResult } from "@/lib/match"
import type { PAResult } from "@/lib/pa"
import type { ScaleResult } from "@/lib/fscale"

export interface StoredResult {
  /** The public result object. */
  result: RfResult
  /** True if this came from a live module, false if it's the mock fallback. */
  live: boolean
}

interface ResultsContextValue {
  /** Latest published result per source (with live/mock flag). */
  get: (source: ResultSource) => StoredResult
  /** True when any module has published a live result. */
  anyLive: boolean
}

/* ------------------------------------------------------------------------ */
/* Module-level external store (framework-free so modules can write it).     */
/* ------------------------------------------------------------------------ */

let storeMap: Record<string, RfResult> = {}
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): Record<string, RfResult> {
  return storeMap
}

/** Publish a mapped public result for a source. Safe to call from anywhere. */
export function publishResult(source: ResultSource, value: RfResult) {
  if (storeMap[source] === value) return
  storeMap = { ...storeMap, [source]: value }
  emit()
}

const ResultsContext = createContext<ResultsContextValue | null>(null)

export function ResultsProvider({ children }: { children: ReactNode }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const get = useCallback(
    (source: ResultSource): StoredResult => {
      const live = storeMap[source]
      if (live) return { result: live, live: true }
      return { result: getMockResult(source), live: false }
    },
    []
  )

  const value = useMemo<ResultsContextValue>(
    () => ({ get, anyLive: Object.keys(storeMap).length > 0 }),
    [get]
  )

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
}

/** Read the latest result for a source (live or mock fallback). */
export function useResults(): ResultsContextValue {
  const ctx = useContext(ResultsContext)
  if (!ctx) throw new Error("useResults must be used within ResultsProvider")
  return ctx
}

/* ------------------------------------------------------------------------ */
/* Module-specific publish hooks.                                           */
/* ------------------------------------------------------------------------ */

/** Module A — publish a raw MatchResult (design frequency fHz for bandwidth). */
export function usePublishMatchResult(raw: MatchResult | null, fHz: number) {
  useEffect(() => {
    if (!raw) return
    publishResult("A", buildMatchingResult(raw, fHz))
  }, [raw, fHz])
}

/** Module B — publish a raw PAResult. */
export function usePublishPAResult(raw: PAResult | null) {
  useEffect(() => {
    if (!raw) return
    publishResult("B", buildPAResult(raw))
  }, [raw])
}

/** Module C — publish a raw ScaleResult. */
export function usePublishScaleResult(raw: ScaleResult | null) {
  useEffect(() => {
    if (!raw) return
    publishResult("C", buildScaleResult(raw))
  }, [raw])
}
