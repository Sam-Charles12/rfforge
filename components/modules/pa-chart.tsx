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

import type { PAResult } from "@/lib/pa"

interface PAChartProps {
  result: PAResult
}

const AXIS_TICK = { fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--chart-axis)" as string }
const GRID_COLOR = "var(--chart-grid)"
const GREEN = "var(--accent-rf-power)"
const BLUE = "var(--accent-primary)"
const SECOND = "var(--series-2)"

export function PAChart({ result }: PAChartProps) {
  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={result.sweep} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="pInDbm"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
            label={{ value: "P_in (dBm)", position: "insideBottom", offset: -6, fontSize: 11, fill: "var(--chart-axis)" }}
          />
          <YAxis
            yAxisId="pout"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `${v}`}
            label={{ value: "P_out / Gain (dB)", angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fill: "var(--chart-axis)" }}
          />
          <YAxis
            yAxisId="pae"
            orientation="right"
            domain={[0, "auto"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${v}`}
            label={{ value: "PAE (%)", angle: 90, position: "insideRight", offset: 8, fontSize: 11, fill: "var(--chart-axis)" }}
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
            labelFormatter={(v) => `P_in = ${v} dBm`}
            formatter={(value, name) => [
              `${Number(value ?? 0).toFixed(2)} ${labelUnit(String(name))}`,
              labelFull(String(name)),
            ]}
          />
          <Line
            yAxisId="pout"
            type="monotone"
            dataKey="pOutDbm"
            name="pOut"
            stroke={BLUE}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-in-out"
          />
          <Line
            yAxisId="pout"
            type="monotone"
            dataKey="gainDb"
            name="gain"
            stroke={GREEN}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-in-out"
          />
          <Line
            yAxisId="pae"
            type="monotone"
            dataKey="pae"
            name="pae"
            stroke={SECOND}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-in-out"
          />
          <ReferenceLine
            yAxisId="pout"
            x={result.p1dB.pInDbm}
            stroke="var(--accent-rf-freq)"
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{
              value: `P1dB ${result.p1dB.pOutDbm.toFixed(1)} dBm`,
              position: "top",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fill: "var(--accent-rf-freq)",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function labelUnit(name: string): string {
  switch (name) {
    case "pOut":
      return "dBm"
    case "gain":
      return "dB"
    case "pae":
      return "%"
    default:
      return ""
  }
}

function labelFull(name: string): string {
  switch (name) {
    case "pOut":
      return "P_out"
    case "gain":
      return "Gain"
    case "pae":
      return "PAE"
    default:
      return name
  }
}
