/**
 * RFForge — Module D explanation entry point (multi-turn).
 *
 * High-level function the UI calls. It builds a numeric-only prompt from the
 * public result contract (FR-D1), attaches the prior conversation, sends the
 * follow-up question to the live Groq route, and falls back to the
 * deterministic template when no key/route is available. On the first turn,
 * only the numeric context is sent and an opening explanation is produced.
 */
import type { RfResult } from "@/types/rf-results"
import { explainFromTemplate, explainFollowUpFromTemplate } from "@/lib/ai/template"

export interface Explanation {
  /** Which engine produced the text. */
  used: "llm" | "template"
  text: string
}

/** One message in the Module D chat thread. */
export interface ChatMessage {
  role: "user" | "assistant"
  text: string
  /** Engine that produced an assistant message (FR-D4 provenance). */
  used?: "llm" | "template"
}

/** Payload sent to the proxy route. */
interface RouteRequest {
  result: RfResult
  /** Prior conversation (excluding the current question). */
  history: { role: "user" | "assistant"; content: string }[]
  /** The user's latest question; empty string seeds the opening explanation. */
  question: string
}

/** Build the numeric-only seed prompt for the LLM (FR-D1: never raw inputs). */
export function buildPrompt(result: RfResult): string {
  return `Here are the calculated result values (units as labeled). Explain them plainly.\n\n${JSON.stringify(result, null, 2)}`
}

/**
 * Generate the next turn of the explanation. On the first turn `history` is
 * empty and `question` is empty (or a short opener); the route seeds the model
 * with the numeric context. On follow-ups, the prior assistant/user messages
 * are replayed so the model can answer coherently. Falls back to the
 * deterministic template on any failure. Always non-empty and read-only
 * (FR-D3): it never alters the supplied result.
 */
export async function generateExplanation(
  result: RfResult,
  history: ChatMessage[],
  question: string
): Promise<Explanation> {
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result,
        history: history.map((h) => ({ role: h.role, content: h.text })),
        question: question.trim(),
      } satisfies RouteRequest),
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

  if (question.trim()) {
    return { used: "template", text: explainFollowUpFromTemplate(result, question) }
  }
  return { used: "template", text: explainFromTemplate(result) }
}
