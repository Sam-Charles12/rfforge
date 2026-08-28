"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { ScaleResult } from "@/lib/fscale"

interface FScaleChartProps {
  result: ScaleResult
  fminGHz: number
  fmaxGHz: number
}

const AXIS_TICK = { fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--chart-axis)" as string }
const GRID_COLOR = "var(--chart-grid)"
const AMBER = "var(--accent-rf-freq)"
const SECOND = "var(--series-2)"

/** Standard band references (FR-C6) — Hz. */
const BANDS: { hz: number; label: string }[] = [
  { hz: 6e9, label: "sub-6" },
  { hz: 24e9, label: "24" },
  { hz: 60e9, label: "60" },
  { hz: 140e9, label: "140" },
]

export function FScaleChart({ result, fminGHz, fmaxGHz }: FScaleChartProps) {
  const data = result.points.map((p) => ({
    fGHz: p.fHz / 1e9,
    il: p.ilDb,
    q: p.inductorQ,
  }))

  const bandLines = BANDS.filter((b) => b.hz / 1e9 >= fminGHz && b.hz / 1e9 <= fmaxGHz)

  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="fGHz"
            type="number"
            scale="log"
            domain={[fminGHz, fmaxGHz]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
            label={{ value: "Frequency (GHz)", position: "insideBottom", offset: -6, fontSize: 11, fill: "var(--chart-axis)" }}
          />
          <YAxis
            yAxisId="il"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[0, "auto"]}
            tickFormatter={(v) => `${v}`}
            label={{ value: "Insertion loss (dB)", angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fill: "var(--chart-axis)" }}
          />
          <YAxis
            yAxisId="q"
            orientation="right"
            domain={[0, "auto"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${v}`}
            label={{ value: "Inductor Q", angle: 90, position: "insideRight", offset: 8, fontSize: 11, fill: "var(--chart-axis)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--glass-bg)",
              backdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelFormatter={(v) => `f = ${Number(v).toFixed(3)} GHz`}
            formatter={(value, name) => {
              const n = Number(value ?? 0)
              if (name === "il") return [`${n.toFixed(2)} dB`, "IL"]
              if (name === "q") return [`${n.toFixed(1)}`, "Inductor Q"]
              return [String(value), String(name)]
            }}
          />
          <Line
            yAxisId="il"
            type="monotone"
            dataKey="il"
            name="il"
            stroke={AMBER}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-in-out"
          />
          <Line
            yAxisId="q"
            type="monotone"
            dataKey="q"
            name="q"
            stroke={SECOND}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-in-out"
          />
          {bandLines.map((b) => (
            <ReferenceLine
              key={b.hz}
              yAxisId="il"
              x={b.hz / 1e9}
              stroke={AMBER}
              strokeOpacity={0.45}
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: b.label,
                position: "insideTopRight",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fill: AMBER,
                opacity: 0.7,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
