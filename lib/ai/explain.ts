/**
 * RFForge — Module D explanation entry point.
 *
 * High-level pure(ish) function the UI calls. It builds a numeric-only prompt
 * from the public result contract (FR-D1), tries the live Groq route, and
 * falls back to the deterministic template when no key/route is available
 * (returns `used: "llm" | "template"` so the UI can label it — FR-D4).
 */
import type { RfResult } from "@/types/rf-results"
import { explainFromTemplate } from "@/lib/ai/template"

export interface Explanation {
  /** Which engine produced the text. */
  used: "llm" | "template"
  text: string
}

/** Build a numeric-only prompt for the LLM (FR-D1: never raw inputs). */
export function buildPrompt(result: RfResult): string {
  return `Here are the calculated result values (units as labeled). Explain them plainly.\n\n${JSON.stringify(result, null, 2)}`
}

/**
 * Explain a result. Tries the live Groq route; on any failure or when no key
 * is configured, uses the deterministic template. Always returns non-empty
 * text. The returned explanation is generated purely from numeric outputs and
 * is read-only — it never alters the supplied result (FR-D3).
 */
export async function generateExplanation(result: RfResult): Promise<Explanation> {
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    })
    if (res.ok) {
      const data = (await res.json()) as { used?: "llm" | "template"; text?: string }
      if (data.text) {
        return { used: data.used === "llm" ? "llm" : "template", text: data.text }
      }
    }
  } catch {
    // fall through to template
  }

  return { used: "template", text: explainFromTemplate(result) }
}
