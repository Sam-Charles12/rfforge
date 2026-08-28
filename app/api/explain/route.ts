/**
 * RFForge — Module D LLM proxy.
 *
 * Server-only route: reads GROQ_API_KEY from env (never exposed to the
 * client), forwards a numeric-only prompt to Groq's OpenAI-compatible endpoint,
 * and returns the plain-language explanation. If no key is configured (or the
 * call fails), it signals the client to fall back to the deterministic
 * template generator so the UI always works.
 */
import { NextResponse } from "next/server"
import type { RfResult } from "@/types/rf-results"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = process.env.GROQ_MODEL ?? "groq/compound"

const SYSTEM_PROMPT =
  "You are an expert RF/microwave engineer writing concise, plain-language " +
  "commentary for engineering students. You receive ONLY calculated numeric " +
  "outputs from a simulation. Explain what the numbers mean. IMPORTANT: you " +
  "are strictly read-only — never invent, derive, or alter any value; never " +
  "repeat or guess the user's input parameters; report only what is provided. " +
  "Use ordinary units. Keep it to 120–220 words, 2–4 short paragraphs, no " +
  "markdown headers."

function buildUserPrompt(result: RfResult): string {
  return `Here are the calculated result values (units as labeled). Explain them plainly.\n\n${JSON.stringify(result, null, 2)}`
}

export async function POST(req: Request) {
  let result: RfResult
  try {
    result = (await req.json()) as RfResult
  } catch {
    return NextResponse.json({ ok: false, used: "template", text: "" }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: true, used: "template", text: "" })
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(result) },
        ],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ ok: true, used: "template", text: "" })
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) {
      return NextResponse.json({ ok: true, used: "template", text: "" })
    }

    return NextResponse.json({ ok: true, used: "llm", text })
  } catch {
    return NextResponse.json({ ok: true, used: "template", text: "" })
  }
}
