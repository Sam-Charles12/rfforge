"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateScale, type BranchName, type NetworkTopology, type ScaleResult } from "@/lib/fscale"

import { FScaleChart } from "./fscale-chart"

interface FormState {
  zlRe: string
  zlIm: string
  z0: string
  q: string
  topology: NetworkTopology
  branch: BranchName
  f0GHz: string
  cpPf: string
  inductorQ: string
  fminGHz: string
  fmaxGHz: string
}

const DEFAULTS: FormState = {
  zlRe: "200",
  zlIm: "0",
  z0: "50",
  q: "10",
  topology: "pi",
  branch: "lp",
  f0GHz: "6",
  cpPf: "0.1",
  inductorQ: "100",
  fminGHz: "1",
  fmaxGHz: "140",
}

const STEPS = 601

export function ModuleC() {
  const [form, setForm] = useState<FormState>(DEFAULTS)

  const result = useMemo<ScaleResult | null>(() => {
    const zlRe = parseFloat(form.zlRe)
    const zlIm = parseFloat(form.zlIm)
    const z0 = parseFloat(form.z0)
    const q = parseFloat(form.q)
    const f0 = parseFloat(form.f0GHz) * 1e9
    const cp = parseFloat(form.cpPf) * 1e-12
    const inductorQ = parseFloat(form.inductorQ)
    const fmin = parseFloat(form.fminGHz) * 1e9
    const fmax = parseFloat(form.fmaxGHz) * 1e9

    if (
      !Number.isFinite(zlRe) || zlRe <= 0 ||
      !Number.isFinite(z0) || z0 <= 0 ||
      !Number.isFinite(f0) || f0 <= 0 ||
      !Number.isFinite(fmin) || fmin < 1e9 ||
      !Number.isFinite(fmax) || fmax > 300e9 ||
      fmax <= fmin ||
      !Number.isFinite(cp) || cp < 0 ||
      !Number.isFinite(inductorQ) || inductorQ <= 0
    ) {
      return null
    }

    return calculateScale({
      zLoad: { re: zlRe, im: zlIm },
      z0,
      f0,
      topology: form.topology,
      q: Number.isFinite(q) ? q : 10,
      branch: form.branch,
      cp,
      inductorQ,
      capQ: 200,
      fmin,
      fmax,
      steps: STEPS,
    })
  }, [form])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="bento-grid w-full">
      {/* Matching network design — inherited from Module A */}
      <Card className="bento-lg glass accent-bg-rf-freq">
        <CardHeader>
          <CardTitle className="text-headline">Network Design · from Module A</CardTitle>
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
            <Field label="Design freq" unit="GHz">
              <Input value={form.f0GHz} onChange={set("f0GHz")} inputMode="decimal" className="numeric" />
            </Field>
          </div>
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
            <Field label="Loaded Q">
              <Input value={form.q} onChange={set("q")} inputMode="decimal" className="numeric" />
            </Field>
          )}
          <div className="flex items-center justify-between gap-3 pt-1">
            <Badge variant="secondary">
              {result?.realizable
                ? form.topology === "l"
                  ? "L fixed-Q"
                  : `Q ${Number.isFinite(parseFloat(form.q)) ? parseFloat(form.q) : "—"}`
                : "not realizable"}
            </Badge>
            {form.topology !== "l" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Click to toggle between the low-pass and high-pass matching prototype"
                aria-label="Toggle between low-pass and high-pass branch"
                onClick={() => setForm((f) => ({ ...f, branch: f.branch === "lp" ? "hp" : "lp" }))}
              >
                Branch: {form.branch.toUpperCase()} · click to switch
              </Button>
            )}
          </div>
          {result && !result.realizable && (
            <p className="text-micro text-accent-danger">{result.reason ?? "Network not realizable for these parameters."}</p>
          )}
        </CardContent>
      </Card>

      {/* Parasitics + sweep */}
      <Card className="bento-lg glass">
        <CardHeader>
          <CardTitle className="text-headline">Parasitics &amp; Sweep</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label="Parasitic C_p" unit="pF">
              <Input value={form.cpPf} onChange={set("cpPf")} inputMode="decimal" className="numeric" />
            </Field>
            <Field label="Inductor Q₀" unit="at design">
              <Input value={form.inductorQ} onChange={set("inductorQ")} inputMode="decimal" className="numeric" />
            </Field>
          </div>
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label="Sweep start" unit="GHz ≥1">
              <Input value={form.fminGHz} onChange={set("fminGHz")} inputMode="decimal" className="numeric" />
            </Field>
            <Field label="Sweep end" unit="GHz ≤300">
              <Input value={form.fmaxGHz} onChange={set("fmaxGHz")} inputMode="decimal" className="numeric" />
            </Field>
          </div>
          <p className="text-micro text-text-tertiary">
            Band markers annotated at sub-6 / 24 / 60 / 140 GHz (FR-C6).
          </p>
        </CardContent>
      </Card>

      {/* Degradation figures of merit */}
      <Card className="bento-lg glass accent-bg-rf-freq">
        <CardHeader>
          <CardTitle className="text-headline">Degradation at Scale</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <StatCard label="SRF (dominant L)" value={result ? fmtFreq(result.srfHz) : "—"} accent />
          <StatCard label="IL @ f_max" value={result ? fnum(result.ilAtFmax) : "—"} unit="dB" />
          <StatCard label="Inductor Q @ f_max" value={result ? fnum(result.qAtFmax) : "—"} />
          <StatCard label="Peak IL over sweep" value={result ? fnum(result.ilPeak) : "—"} unit="dB" accent />
        </CardContent>
      </Card>

      {/* Primary chart — full width */}
      <Card className="bento-full glass accent-bg-rf-freq">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-headline">Insertion Loss &amp; Inductor Q vs Frequency</CardTitle>
          {result?.realizable && (
            <Badge variant="outline">
              SRF {fmtFreq(result.srfHz)} · IL@fmax {fnum(result.ilAtFmax)} dB
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {result?.realizable ? (
            <FScaleChart result={result} fminGHz={parseFloat(form.fminGHz)} fmaxGHz={parseFloat(form.fmaxGHz)} />
          ) : (
            <p className="text-caption text-text-tertiary">Enter valid parameters above.</p>
          )}
        </CardContent>
      </Card>
    </div>
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
    <Card className={`flex flex-col justify-between rounded-lg border bg-surface-1 p-6 ${accent ? "accent-bg-rf-freq" : "border-border-subtle"}`}>
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
  return v >= 1000 ? v.toFixed(0) : v.toFixed(2)
}

function fmtFreq(hz: number | undefined): string {
  if (hz === undefined || !Number.isFinite(hz)) return "—"
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MHz`
  return `${hz.toFixed(0)} Hz`
}
