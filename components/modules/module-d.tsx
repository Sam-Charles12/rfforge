"use client"

import { useState } from "react"
import type { ComponentProps } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { useResults } from "@/components/engine/results-provider"
import { generateExplanation, type Explanation } from "@/lib/ai/explain"
import type { RfResult, ResultSource } from "@/types/rf-results"

const SOURCES: { id: ResultSource; label: string }[] = [
  { id: "A", label: "Matching" },
  { id: "B", label: "PA Performance" },
  { id: "C", label: "Frequency Scaling" },
]

function Stat({
  label,
  value,
  unit,
  className,
}: {
  label: string
  value: string
  unit?: string
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-[var(--glass-border)] bg-input/20 px-4 py-2", className)}>
      <div className="text-micro text-text-tertiary">{label}</div>
      <div className="text-title font-semibold text-foreground">
        {value}
        {unit && <span className="ml-1 text-caption font-normal text-text-tertiary">{unit}</span>}
      </div>
    </div>
  )
}

function resultStats(result: RfResult) {
  switch (result.source) {
    case "A":
      return [
        { label: "Topology", value: result.topology.toUpperCase() },
        { label: "Q", value: result.qFactor.toFixed(1) },
        { label: "Bandwidth", value: (result.bandwidthHz / 1e6).toFixed(0), unit: "MHz" },
        { label: "Return loss", value: result.matchedReturnLossDb.toFixed(1), unit: "dB" },
      ]
    case "B":
      return [
        { label: "Gain", value: result.gainDb.toFixed(1), unit: "dB" },
        { label: "Psat", value: result.pSatDbm.toFixed(1), unit: "dBm" },
        { label: "P1dB", value: result.p1dBOutDbm.toFixed(1), unit: "dBm" },
        { label: "PAE peak", value: result.paePeakPct.toFixed(1), unit: "%" },
      ]
    case "C":
      return [
        { label: "SRF", value: result.srfGHz.toFixed(1), unit: "GHz" },
        { label: "IL @ fmax", value: result.ilAtFmaxDb.toFixed(1), unit: "dB" },
        { label: "IL peak", value: result.ilPeakDb.toFixed(1), unit: "dB" },
        { label: "Q @ fmax", value: result.qAtFmax.toFixed(1) },
      ]
  }
}

interface PillButtonProps extends ComponentProps<"button"> {
  active?: boolean
}

function PillButton({ active, className, ...props }: PillButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "h-8 cursor-pointer rounded-lg px-3 text-caption font-medium transition-colors",
        active
          ? "bg-[var(--accent-ai)] text-white"
          : "text-text-secondary hover:bg-muted/50 hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export function ModuleD() {
  const { get } = useResults()
  const [source, setSource] = useState<ResultSource>("A")
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<Explanation | null>(null)

  const stored = get(source)

  const run = async () => {
    setLoading(true)
    setExplanation(null)
    const e = await generateExplanation(stored.result)
    setExplanation(e)
    setLoading(false)
  }

  return (
    <div className="bento-grid w-full">
      <Card className="bento-full glass accent-bg-ai">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-headline py-2">AI Explanation Layer</CardTitle>
            <p className="text-caption text-text-tertiary">
              Plain-language commentary on calculated results. Read-only: never alters a computed value.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-caption text-text-tertiary">Explain</span>
            <Toggle checked={enabled} onCheckedChange={setEnabled} aria-label="Toggle AI explanation" />
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-center gap-2">
            {SOURCES.map((s) => (
              <PillButton key={s.id} active={source === s.id} onClick={() => setSource(s.id)}>
                {s.id} · {s.label}
              </PillButton>
            ))}
          </div>

          {/* Numeric outputs being explained (FR-D4: separated from AI text) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resultStats(stored.result).map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>

          {stored.live ? (
            <p className="text-micro text-text-tertiary">Reading live results from Module {source}.</p>
          ) : (
            <p className="text-micro text-text-tertiary">
              Module {source} has not run yet — showing representative sample values.
            </p>
          )}

          <div>
            <Button onClick={run} disabled={!enabled || loading} size="default">
              {loading ? "Explaining…" : "Generate explanation"}
            </Button>
          </div>

          {explanation && (
            <div className="space-y-3 rounded-xl border border-[var(--accent-ai)]/30 bg-[var(--accent-ai)]/5 p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-[var(--accent-ai)]/40 text-[var(--accent-ai)]">
                  AI · {explanation.used === "llm" ? "LLM" : "template"}
                </Badge>
                <span className="text-micro text-text-tertiary">Generated from calculated values only</span>
              </div>
              <p className="text-body leading-relaxed text-foreground">{explanation.text}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
