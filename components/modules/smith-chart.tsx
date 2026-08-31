"use client"

import { useMemo } from "react"

import type { Complex, MatchResult } from "@/lib/match"
import { matchingPath } from "@/lib/match"

interface SmithChartProps {
  z0: number
  zLoad: Complex
  result: MatchResult
  branch: "lp" | "hp"
}

const SIZE = 360
const C = SIZE / 2
const R = SIZE / 2 - 14

const GRID = "var(--chart-grid)"
const GRID_STRONG = "var(--chart-grid-strong)"
const AXIS = "var(--chart-axis)"
const PATH = "var(--accent-rf-match)"
const LOAD = "var(--accent-rf-freq)"
const SRC = "var(--accent-success)"

// Quantize coordinates to a fixed precision so the server and client render
// byte-identical <path d="..."> / circle attributes. Tiny floating-point
// differences between the two JS runtimes would otherwise produce a React
// hydration mismatch (identical structure, differing trailing digits).
const fmt = (v: number) => v.toFixed(3)
const px = (gx: number) => fmt(C + gx * R)
const py = (gy: number) => fmt(C - gy * R)

/**
 * Portable SVG "stretch" Smith chart: unit circle in the Gamma plane with
 * representative constant-resistance / constant-reactance grids, plus the
 * load-to-center matching trajectory for the active network & branch.
 */
export function SmithChart({ z0, zLoad, result, branch }: SmithChartProps) {
  const path = useMemo(() => {
    if (!result.realizable) return []
    if (result.topology === "l") {
      const br = result.lBranches?.find((b) => b.branch === branch)
      if (!br) return []
      return matchingPath("l", br, z0, { re: zLoad.re / z0, im: zLoad.im / z0 })
    }
    const elems = branch === "lp" ? result.piT?.lp : result.piT?.hp
    if (!elems) return []
    return matchingPath(result.topology, elems, z0, { re: zLoad.re / z0, im: zLoad.im / z0 })
  }, [result, branch, z0, zLoad])

  // Build discrete polylines for the grid by sampling in normalized coords.
  // Precomputed once (module scope) so server and client render byte-identical
  // <path d="..."> strings — avoids React hydration mismatches from floating
  // point output that would otherwise differ between the two render runs.
  const rGrid = (() => {
    const rVals = [0.2, 0.5, 1, 2, 5]
    return rVals.map((r) => {
      const cx = r / (r + 1)
      const rad = 1 / (r + 1)
      const n = 120
      const pts: string[] = []
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2
        pts.push(`${px(cx + rad * Math.cos(t))},${py(rad * Math.sin(t))}`)
      }
      return { r, d: `M ${pts.join(" L ")} Z` }
    })
  })()

  const xGrid = (() => {
    const xVals = [0.2, 0.5, 1, 2, 5]
    const out: { x: number; sign: 1 | -1; d: string }[] = []
    for (const x of xVals) {
      for (const sign of [1, -1] as const) {
        const sv = sign * x
        const cy = sv > 0 ? 1 / x : -1 / x
        const rad = 1 / x
        const n = 140
        const pts: string[] = []
        for (let i = 0; i <= n; i++) {
          const t = (i / n) * Math.PI * 2
          const gx = 1 + rad * Math.cos(t)
          const gy = cy + rad * Math.sin(t)
          const inCircle = gx * gx + gy * gy <= 1.0001
          if (inCircle) pts.push(`${px(gx)},${py(gy)}`)
        }
        if (pts.length > 0) out.push({ x, sign, d: `M ${pts.join(" L ")}` })
      }
    }
    return out
  })()

  const loadPts = path.length > 0 ? path[0].gamma : null
  const srcPts = path.length > 0 ? path[path.length - 1].gamma : null
  const mid = path.slice(1, -1)

  const poly = path.length > 1 ? `M ${path.map((p) => `${px(p.gamma.re)},${py(p.gamma.im)}`).join(" L ")}` : ""

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block max-h-[360px] w-full selection:bg-transparent"
      role="img"
      aria-label="Smith chart matching trajectory"
    >
      <circle cx={C} cy={C} r={R} fill="var(--chart-fill-soft)" stroke={GRID_STRONG} strokeWidth={1.4} />

      {/* constant-resistance circles */}
      {rGrid.map((g) => (
        <path key={`r${g.r}`} d={g.d} fill="none" stroke={GRID} strokeWidth={0.7} />
      ))}

      {/* constant-reactance arcs */}
      {xGrid.map((g) => (
        <path key={`x${g.sign * g.x}`} d={g.d} fill="none" stroke={GRID} strokeWidth={0.7} />
      ))}

      {/* axes */}
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke={AXIS} strokeWidth={1} />
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke={AXIS} strokeWidth={1} />

      {/* matching trajectory */}
      {poly && (
        <path d={poly} fill="none" stroke={PATH} strokeWidth={2} strokeLinecap="round" strokeDasharray="6 3" />
      )}

      {/* intermediate nodes */}
      {mid.map((p, i) => (
        <circle key={i} cx={px(p.gamma.re)} cy={py(p.gamma.im)} r={3.5} fill="var(--accent-primary)" stroke="var(--svg-line-soft)" strokeWidth={0.8} />
      ))}

      {/* source (matched center) */}
      {srcPts && (
        <g>
          <circle cx={px(srcPts.re)} cy={py(srcPts.im)} r={4.5} fill={SRC} stroke="var(--svg-line-soft)" strokeWidth={0.8} />
          <text x={px(srcPts.re) + 8} y={py(srcPts.im) + 3} fontSize={10} fill="var(--text-secondary)" fontFamily="var(--font-mono)">
            Z₀
          </text>
        </g>
      )}

      {/* load point */}
      {loadPts && (
        <g>
          <circle cx={px(loadPts.re)} cy={py(loadPts.im)} r={4.5} fill={LOAD} stroke="var(--svg-line-soft)" strokeWidth={0.8} />
          <text x={px(loadPts.re) + 8} y={py(loadPts.im) + 3} fontSize={10} fill="var(--text-secondary)" fontFamily="var(--font-mono)">
            Z_L
          </text>
        </g>
      )}
    </svg>
  )
}
