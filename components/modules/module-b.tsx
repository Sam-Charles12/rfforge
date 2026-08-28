"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculatePA, type DeviceType, type PAResult } from "@/lib/pa"

import { PAChart } from "./pa-chart"

interface FormState {
  pDcW: string
  gainDb: string
  psatDbm: string
  pInStartDbm: string
  pInEndDbm: string
  smoothness: string
  deviceType: DeviceType
}

const DEFAULTS: FormState = {
  pDcW: "2",
  gainDb: "20",
  psatDbm: "30",
  pInStartDbm: "-20",
  pInEndDbm: "10",
  smoothness: "1",
  deviceType: "fet",
}

const STEPS = 601

export function ModuleB() {
  const [form, setForm] = useState<FormState>(DEFAULTS)

  const result = useMemo<PAResult | null>(() => {
    const pDcW = parseFloat(form.pDcW)
    const gainDb = parseFloat(form.gainDb)
    const psatDbm = parseFloat(form.psatDbm)
    const pInStartDbm = parseFloat(form.pInStartDbm)
    const pInEndDbm = parseFloat(form.pInEndDbm)
    const smoothness = parseFloat(form.smoothness)

    if (
      !Number.isFinite(pDcW) ||
      !Number.isFinite(gainDb) ||
      !Number.isFinite(psatDbm) ||
      !Number.isFinite(pInStartDbm) ||
      !Number.isFinite(pInEndDbm) ||
      !Number.isFinite(smoothness) ||
      pDcW <= 0 ||
      smoothness <= 0
    ) {
      return null
    }

    return calculatePA({
      pDcW,
      gainDb,
      psatDbm,
      pInStartDbm,
      pInEndDbm,
      steps: STEPS,
      smoothness,
      deviceType: form.deviceType,
    })
  }, [form])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="bento-grid w-full">
      {/* Input form — solid surface (NOT glass) per design.md §3.2/§6 */}
      <Card className="bento-lg glass accent-bg-rf-power">
        <CardHeader>
          <CardTitle className="text-headline">PA Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label="DC supply" unit="W">
              <Input value={form.pDcW} onChange={set("pDcW")} inputMode="decimal" className="numeric" />
            </Field>
            <Field label="Small-signal gain" unit="dB">
              <Input value={form.gainDb} onChange={set("gainDb")} inputMode="decimal" className="numeric" />
            </Field>
          </div>
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label="Saturation power" unit="dBm">
              <Input value={form.psatDbm} onChange={set("psatDbm")} inputMode="decimal" className="numeric" />
            </Field>
            <Field label="Sweep start" unit="dBm">
              <Input value={form.pInStartDbm} onChange={set("pInStartDbm")} inputMode="decimal" className="numeric" />
            </Field>
          </div>
          <div className="grid grid-cols-2 items-end gap-4">
            <Field label="Sweep end" unit="dBm">
              <Input value={form.pInEndDbm} onChange={set("pInEndDbm")} inputMode="decimal" className="numeric" />
            </Field>
            <Field label="Smoothness (p)" unit="≈1">
              <Input value={form.smoothness} onChange={set("smoothness")} inputMode="decimal" className="numeric" />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Badge variant="secondary">{form.deviceType === "fet" ? "FET" : "BJT"}</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Click to switch device type: controls whether efficiency is labelled as Drain (FET) or Collector (BJT)"
              aria-label="Switch device type between FET and BJT"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  deviceType: f.deviceType === "fet" ? "bjt" : "fet",
                }))
              }
            >
              Device: {form.deviceType.toUpperCase()} · click to switch
            </Button>
          </div>
          <p className="text-micro text-text-tertiary">
            Efficiency terminology follows device type: {result?.drainLabel ?? "Drain"} for the
            {form.deviceType === "fet" ? " FET" : " BJT"}.
          </p>
        </CardContent>
      </Card>

      {/* Stat cards — bento-lg column pairing with the chart */}
      <Card className="bento-lg glass">
        <CardHeader>
          <CardTitle className="text-headline">Figures of Merit</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <StatCard label="Saturation" value={formatDbm(result?.pSatDbm)} unit="dBm" />
          <StatCard
            label="P1dB (out)"
            value={formatDbm(result?.p1dB.pOutDbm)}
            unit="dBm"
            accent
          />
          <StatCard label="PAE peak" value={formatPct(result?.paePeak)} unit="%" />
          <StatCard
            label={`${result?.drainLabel ?? "Efficiency"} eff. peak`}
            value={formatPct(result?.drainEfficiencyPeak)}
            unit="%"
          />
        </CardContent>
      </Card>

      {/* Primary chart — spans the full bento width */}
      <Card className="bento-full glass accent-bg-rf-power">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-headline">P_out / Gain / PAE vs P_in</CardTitle>
          {result && (
            <Badge variant="outline">
              P1dB: {result.p1dB.pInDbm.toFixed(1)} dBm in · {result.p1dB.pOutDbm.toFixed(1)} dBm out
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {result ? <PAChart result={result} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, unit, children }: { label: string; unit: string; children: React.ReactNode }) {
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

function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: string
  unit: string
  accent?: boolean
}) {
  return (
    <Card
      className={`flex flex-col justify-between rounded-lg border bg-surface-1 p-6 ${
        accent ? "accent-bg-rf-freq" : "border-border-subtle"
      }`}
    >
      <span className="text-micro text-text-tertiary">{label}</span>
      <span className="text-data-lg mt-2 text-text-primary">
        {value}
        <span className="text-data-sm text-text-tertiary"> {unit}</span>
      </span>
    </Card>
  )
}

function formatDbm(v: number | undefined): string {
  return v === undefined ? "—" : v.toFixed(1)
}

function formatPct(v: number | undefined): string {
  return v === undefined ? "—" : v.toFixed(1)
}
