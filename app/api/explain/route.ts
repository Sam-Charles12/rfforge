/**
 * RFForge — Module D LLM proxy.
 *
 * Server-only route: reads GROQ_API_KEY from env (never exposed to the
 * client), forwards a numeric-only seed plus the prior conversation and a
 * follow-up question to Groq's OpenAI-compatible endpoint, and returns the
 * next plain-language reply. If no key is configured (or the call fails), it
 * signals the client to fall back to the deterministic template generator so
 * the UI always works.
 */
import { NextResponse } from "next/server"
import type { RfResult } from "@/types/rf-results"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = process.env.GROQ_MODEL ?? "groq/compound"

const SYSTEM_PROMPT =
  "You are an expert RF/microwave engineer having a chat with engineering " +
  "students. Your first input is ONLY the calculated numeric outputs from a " +
  "simulation, followed by a question. Explain what the numbers mean and " +
  "answer follow-up questions using ONLY those numbers and the prior " +
  "conversation. IMPORTANT: you are strictly read-only — never invent, derive, " +
  "or alter any value; never repeat or guess the user's design input parameters " +
  "(impedances, frequencies, component values, etc.); report only what is " +
  "provided. Use ordinary units. Keep each reply to 60–150 words, 1–2 short " +
  "paragraphs, no markdown headers."

interface IncomingMessage {
  role?: string
  content?: string
}

function buildUserPrompt(result: RfResult): string {
  return `Here are the calculated result values (units as labeled). Explain them plainly.\n\n${JSON.stringify(result, null, 2)}`
}

export async function POST(req: Request) {
  let body: { result?: RfResult; history?: IncomingMessage[]; question?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, used: "template", text: "" }, { status: 400 })
  }

  const result = body.result
  if (!result || typeof result !== "object") {
    return NextResponse.json({ ok: false, used: "template", text: "" }, { status: 400 })
  }

  // Prior conversation (assistant + user turns), the current question excluded.
  const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.history)
    ? body.history.filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
    : []
  const question = typeof body.question === "string" ? body.question.trim() : ""

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: true, used: "template", text: "" })
  }

  try {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(result) },
      ...history,
    ]
    messages.push(
      question
        ? { role: "user", content: question }
        : { role: "user", content: "Now explain the above results plainly for an engineering student." }
    )

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
        messages,
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
