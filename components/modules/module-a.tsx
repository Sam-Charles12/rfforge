"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePublishMatchResult } from "@/components/engine/results-provider"
import { cappedReturnLossText, isBeyondReturnLossCap } from "@/lib/rf/return-loss"
import {
  calculateMatch,
  formatComponent,
  minimumNetworkQ,
  type BranchName,
  type ComponentValue,
  type ElementType,
  type MatchResult,
  type NetworkElements,
  type NetworkTopology,
} from "@/lib/match"

import { SmithChart } from "./smith-chart"

interface FormState {
  zlRe: string
  zlIm: string
  z0: string
  freq: string
  freqUnit: "MHz" | "GHz"
  topology: NetworkTopology
  q: string
  branch: BranchName
}

const DEFAULTS: FormState = {
  zlRe: "1700",
  zlIm: "0",
  z0: "100",
  freq: "900",
  freqUnit: "MHz",
  topology: "pi",
  q: "8",
  branch: "lp",
}

function freqToHz(v: string, unit: "MHz" | "GHz"): number {
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return NaN
  return n * (unit === "MHz" ? 1e6 : 1e9)
}

export function ModuleA() {
  const [form, setForm] = useState<FormState>(DEFAULTS)

  const result = useMemo<MatchResult | null>(() => {
    const zlRe = parseFloat(form.zlRe)
    const zlIm = parseFloat(form.zlIm)
    const z0 = parseFloat(form.z0)
    const f = freqToHz(form.freq, form.freqUnit)
    const q = parseFloat(form.q)
    if (!Number.isFinite(zlRe) || !Number.isFinite(zlIm) || !Number.isFinite(z0) || !Number.isFinite(f) || zlRe <= 0 || z0 <= 0) {
      return null
    }
    return calculateMatch({
      zSource: { re: z0, im: 0 },
      zLoad: { re: zlRe, im: zlIm },
      z0,
      f,
      topology: form.topology,
      q: Number.isFinite(q) ? q : 10,
    })
  }, [form])

  const fHz = useMemo(() => freqToHz(form.freq, form.freqUnit), [form.freq, form.freqUnit])
  usePublishMatchResult(result, fHz)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const qmin = useMemo(() => minimumNetworkQ(parseFloat(form.z0) || 0, parseFloat(form.zlRe) || 0), [form.z0, form.zlRe])

  return (
    <div className="bento-grid w-full">
      {/* Input form */}
      <Card className="bento-lg glass accent-bg-rf-match">
        <CardHeader>
          <CardTitle className="text-headline">Match Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label="Load R" unit="Ω">
              <Input value={form.zlRe} onChange={set("zlRe")} inputMode="decimal" className="numeric" />
            </Field>
            <Field label="Load X" unit="Ω">
              <Input value={form.zlIm} onChange={set("zlIm")} inputMode="decimal" className="numeric" />
            </Field>
          </div>
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label="Reference Z₀" unit="Ω">
              <Input value={form.z0} onChange={set("z0")} inputMode="decimal" className="numeric" />
            </Field>
            <Field label={`Frequency · ${form.freqUnit}`}>
              <div className="flex gap-2">
                <Input value={form.freq} onChange={set("freq")} inputMode="decimal" className="numeric flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  title="Click to switch the frequency unit between MHz and GHz"
                  aria-label="Switch frequency unit between MHz and GHz"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      freqUnit: f.freqUnit === "MHz" ? "GHz" : "MHz",
                      freq: f.freqUnit === "MHz" ? (parseFloat(f.freq) / 1000).toFixed(3) : (parseFloat(f.freq) * 1000).toString(),
                    }))
                  }
                >
                  {form.freqUnit}
                </Button>
              </div>
            </Field>
          </div>

          {/* Topology selector */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(["l", "pi", "t"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={form.topology === t ? "default" : "outline"}
                size="sm"
                onClick={() => setForm((f) => ({ ...f, topology: t }))}
              >
                {t.toUpperCase()}
              </Button>
            ))}
          </div>

          {form.topology !== "l" && (
            <Field label="Loaded Q" unit={qmin > 0 ? `min ${qmin.toFixed(2)}` : undefined}>
              <Input value={form.q} onChange={set("q")} inputMode="decimal" className="numeric" />
            </Field>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <Badge variant="secondary">
              {result?.realizable
                ? form.topology === "l"
                  ? "Q fixed by ratio"
                  : `Q ${Number.isFinite(parseFloat(form.q)) ? parseFloat(form.q) : "—"}`
                : "not realizable"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Click to toggle between low-pass and high-pass filter topology"
              aria-label="Toggle between low-pass and high-pass branch"
              onClick={() => setForm((f) => ({ ...f, branch: f.branch === "lp" ? "hp" : "lp" }))}
            >
              Branch: {form.branch.toUpperCase()} · click to switch
            </Button>
          </div>
          {result && !result.realizable && (
            <p className="text-micro text-accent-danger">{result.reason ?? "Network not realizable for these parameters."}</p>
          )}
          {result?.realizable && form.topology !== "l" && result.piT && (
            <p className="text-micro text-text-tertiary">
              Q_min={result.piT.Qmin.toFixed(2)} · R_v={result.piT.Rv.toFixed(1)}Ω · Δf={formatFreq(result.piT.bandwidth)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Solved network — component values */}
      <Card className="bento-lg glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-headline">Solved Network</CardTitle>
          {result?.realizable && <Badge variant="outline">{form.topology.toUpperCase()} · {form.branch.toUpperCase()}</Badge>}
        </CardHeader>
        <CardContent>
          {result?.realizable ? (
            form.topology === "l" ? (
              <LNetworkView result={result} branch={form.branch} />
            ) : (
              <PiTView result={result} branch={form.branch} />
            )
          ) : (
            <p className="text-caption text-text-tertiary">Enter valid parameters above.</p>
          )}
        </CardContent>
      </Card>

      {/* Match quality stats */}
      <Card className="bento-lg glass accent-bg-rf-match">
        <CardHeader>
          <CardTitle className="text-headline">Match Quality</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <StatCard label="Load |Γ|" value={result ? fnum(result.loadReflection.mag) : "—"} accent />
          <StatCard label="Load return loss" value={result ? fnum(result.loadReflection.returnLossDb) + "" : "—"} unit="dB" />
          <StatCard label="Phase" value={result ? fnum(result.loadReflection.phaseDeg) + "" : "—"} unit="°" />
          <StatCard
            label="Matched |Γ|"
            value={result?.realizable ? "≈0" : "—"}
            unit={result?.realizable ? result.topology === "l" ? "" : `(-${fnum(result.matchedReflection.returnLossDb)} dB)` : ""}
            accent
          />
        </CardContent>
      </Card>

      {/* Smith chart */}
      <Card className="bento-lg glass accent-bg-rf-match">
        <CardHeader>
          <CardTitle className="text-headline">Stretch Smith Chart</CardTitle>
        </CardHeader>
        <CardContent>
          {result?.realizable ? (
            <SmithChart z0={parseFloat(form.z0) || 50} zLoad={{ re: parseFloat(form.zlRe) || 0, im: parseFloat(form.zlIm) || 0 }} result={result} branch={form.branch} />
          ) : (
            <p className="text-caption text-text-tertiary">No matching path to plot.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LNetworkView({ result, branch }: { result: MatchResult; branch: BranchName }) {
  const b = result.lBranches?.find((x) => x.branch === branch) ?? result.lBranches?.[0]
  if (!b) return <p className="text-caption text-text-tertiary">No solution for this branch.</p>
  return (
    <div className="space-y-4">
      <SchematicL layout={b.layout} shunt={b.shunt} series={b.series} />
      <div className="grid grid-cols-2 gap-3">
        <ValueCard label={b.layout === "shunt-load" ? "Shunt (load end)" : "Shunt (source end)"} c={b.shunt} />
        <ValueCard label={b.layout === "shunt-load" ? "Series (source end)" : "Series (load end)"} c={b.series} />
      </div>
      <p className="text-micro text-text-tertiary">L-network loaded Q is fixed at {b.Q.toFixed(3)} by the resistance ratio.</p>
    </div>
  )
}

function PiTView({ result, branch }: { result: MatchResult; branch: BranchName }) {
  const elems: NetworkElements | undefined = branch === "lp" ? result.piT?.lp : result.piT?.hp
  if (!elems) return <p className="text-caption text-text-tertiary">No solution for this branch.</p>
  const pi = result.topology === "pi"
  return (
    <div className="space-y-4">
      <SchematicPiT pi={pi} elems={elems} />
      <div className="grid grid-cols-3 gap-3">
        <ValueCard label={pi ? "Shunt (source)" : "Series (source)"} c={pi ? elems.leftShunt : elems.series} />
        <ValueCard label="Series arm / shunt" c={pi ? elems.series : elems.leftShunt} />
        <ValueCard label={pi ? "Shunt (load)" : "Series (load)"} c={elems.rightShunt} />
      </div>
    </div>
  )
}

function ValueCard({ label, c }: { label: string; c: ComponentValue }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
      <span className="text-micro text-text-tertiary">{label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-data-md text-text-primary">{formatComponent(c.value, c.type)}</span>
        <span className="text-data-sm text-text-tertiary">{c.type === "L" ? "L" : "C"}</span>
      </div>
      <span className="text-micro text-text-tertiary">|X| = {Math.abs(c.reactance).toFixed(1)} Ω</span>
    </div>
  )
}

function SchematicL({ layout, shunt, series }: { layout: "shunt-load" | "series-load"; shunt: ComponentValue; series: ComponentValue }) {
  const shuntNearLoad = layout === "shunt-load"
  return (
    <svg viewBox="0 0 320 64" className="h-14 w-full">
      <line x1={8} y1={32} x2={58} y2={32} stroke="var(--svg-line)" strokeWidth={1.5} />
      <line x1={262} y1={32} x2={312} y2={32} stroke="var(--svg-line)" strokeWidth={1.5} />
      {/* source */}
      <text x={8} y={18} fontSize={10} fill="var(--text-secondary)" fontFamily="var(--font-mono)">src</text>
      {/* series element in the middle of top run */}
      <text x={135} y={46} fontSize={12} textAnchor="middle" fill="var(--text-primary)" fontFamily="var(--font-mono)">
        {series.type}
      </text>
      <line x1={120} y1={32} x2={150} y2={32} stroke="var(--svg-line)" strokeWidth={1.5} />
      {/* shunt dropping to ground below the load end */}
      {(shuntNearLoad ? (
        <g>
          <text x={262} y={46} fontSize={12} textAnchor="middle" fill="var(--text-primary)" fontFamily="var(--font-mono)">{shunt.type}</text>
          <line x1={280} y1={32} x2={280} y2={56} stroke="var(--svg-line)" strokeWidth={1.5} />
        </g>
      ) : (
        <g>
          <text x={40} y={46} fontSize={12} textAnchor="middle" fill="var(--text-primary)" fontFamily="var(--font-mono)">{shunt.type}</text>
          <line x1={40} y1={32} x2={40} y2={56} stroke="var(--svg-line)" strokeWidth={1.5} />
        </g>
      ))}
      <line x1={8} y1={56} x2={312} y2={56} stroke="var(--svg-line-soft)" strokeWidth={1} />
      <text x={312} y={18} fontSize={10} textAnchor="end" fill="var(--text-secondary)" fontFamily="var(--font-mono)">load</text>
    </svg>
  )
}

function SchematicPiT({ pi, elems }: { pi: boolean; elems: NetworkElements }) {
  const a = pi ? elems.leftShunt : elems.series // source-side element
  const b = pi ? elems.series : elems.leftShunt // middle
  const c = elems.rightShunt // load-side element
  return (
    <svg viewBox="0 0 320 64" className="h-16 w-full">
      <line x1={8} y1={32} x2={312} y2={32} stroke="var(--svg-line)" strokeWidth={1.5} />
      <line x1={8} y1={56} x2={312} y2={56} stroke="var(--svg-line-soft)" strokeWidth={1} />
      <text x={8} y={18} fontSize={10} fill="var(--text-secondary)" fontFamily="var(--font-mono)">src</text>
      <text x={312} y={18} fontSize={10} textAnchor="end" fill="var(--text-secondary)" fontFamily="var(--font-mono)">load</text>
      {pi ? (
        <>
          <Shunt x={80} sym={a.type} />
          <SeriesC x={160} sym={b.type} />
          <Shunt x={250} sym={c.type} />
        </>
      ) : (
        <>
          <SeriesC x={80} sym={a.type} />
          <Shunt x={160} sym={b.type} />
          <SeriesC x={250} sym={c.type} />
        </>
      )}
    </svg>
  )
}

function SeriesC({ x, sym }: { x: number; sym: ElementType }) {
  return <text x={x} y={46} fontSize={12} textAnchor="middle" fill="var(--text-primary)" fontFamily="var(--font-mono)">{sym}</text>
}

function Shunt({ x, sym }: { x: number; sym: ElementType }) {
  return (
    <g>
      <text x={x} y={46} fontSize={12} textAnchor="middle" fill="var(--text-primary)" fontFamily="var(--font-mono)">{sym}</text>
      <line x1={x} y1={32} x2={x} y2={56} stroke="var(--svg-line)" strokeWidth={1.5} />
    </g>
  )
}

function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="min-h-[2.4rem] items-start text-caption leading-snug text-text-secondary">
        {label}
        {unit ? <span className="text-text-tertiary"> · {unit}</span> : null}
      </Label>
      {children}
    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <Card className={`flex flex-col justify-between rounded-lg border bg-surface-1 p-6 ${accent ? "accent-bg-rf-match" : "border-border-subtle"}`}>
      <span className="text-micro text-text-tertiary">{label}</span>
      <span className="text-data-lg mt-2 text-text-primary">
        {value}
        {unit ? <span className="text-data-sm text-text-tertiary"> {unit}</span> : null}
      </span>
    </Card>
  )
}

function fnum(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—"
  return v.toFixed(3)
}

function formatFreq(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MHz`
  return `${hz.toFixed(0)} Hz`
}
