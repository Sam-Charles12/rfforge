"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ComponentProps } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useResults } from "@/components/engine/results-provider"
import { generateExplanation, type ChatMessage } from "@/lib/ai/explain"
import type { RfResult, ResultSource } from "@/types/rf-results"

const SOURCES: { id: ResultSource; label: string }[] = [
  { id: "A", label: "Matching" },
  { id: "B", label: "PA Performance" },
  { id: "C", label: "Frequency Scaling" },
]

/* Calculated outputs — solid `--surface-1` card holding the numbers in
   monospace (design.md §3.2, §6, §2.1). The canonical data hero. */
function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border-subtle bg-surface-1 p-4">
      <span className="text-micro text-text-tertiary">{label}</span>
      <span className="text-data-md mt-2 text-text-primary">
        {value}
        {unit && <span className="text-data-sm text-text-tertiary"> {unit}</span>}
      </span>
    </div>
  )
}

function resultStats(result: RfResult) {
  switch (result.source) {
    case "A":
      return [
        { label: "Topology", value: result.topology.toUpperCase() },
        { label: "Q", value: result.qFactor.toFixed(1) },
        { label: "Bandwidth", value: (result.bandwidthHz / 1e6).toFixed(0), unit: "MHz" },
        { label: "Return loss", value: result.matchedReturnLossDb.toFixed(1), unit: "dB" },
      ]
    case "B":
      return [
        { label: "Gain", value: result.gainDb.toFixed(1), unit: "dB" },
        { label: "Psat", value: result.pSatDbm.toFixed(1), unit: "dBm" },
        { label: "P1dB", value: result.p1dBOutDbm.toFixed(1), unit: "dBm" },
        { label: "PAE peak", value: result.paePeakPct.toFixed(1), unit: "%" },
      ]
    case "C":
      return [
        { label: "SRF", value: result.srfGHz.toFixed(1), unit: "GHz" },
        { label: "IL @ fmax", value: result.ilAtFmaxDb.toFixed(1), unit: "dB" },
        { label: "IL peak", value: result.ilPeakDb.toFixed(1), unit: "dB" },
        { label: "Q @ fmax", value: result.qAtFmax.toFixed(1) },
      ]
  }
}

interface PillButtonProps extends ComponentProps<"button"> {
  active?: boolean
}

/* Module switch pills — active state uses the solid accent (like Tabs §6). */
function PillButton({ active, className, ...props }: PillButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "h-8 cursor-pointer rounded-md px-3 text-caption font-medium transition-colors",
        active
          ? "bg-[var(--accent-ai)] text-white"
          : "text-text-secondary hover:bg-muted/50 hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  )
}

const emptyThreads = (): Record<ResultSource, ChatMessage[]> => ({ A: [], B: [], C: [] })

export function ModuleD() {
  const { get } = useResults()
  const [source, setSource] = useState<ResultSource>("A")
  const [enabled, setEnabled] = useState(false)
  const [threads, setThreads] = useState<Record<ResultSource, ChatMessage[]>>(emptyThreads)
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const stored = get(source)
  const messages = threads[source]

  // Give each user turn a running question number for the transcript labels.
  const rendered: { msg: ChatMessage; questionNo?: number }[] = []
  let questionNo = 0
  for (const msg of messages) {
    if (msg.role === "user") questionNo++
    rendered.push({ msg, questionNo: msg.role === "user" ? questionNo : undefined })
  }

  const appendTo = useCallback((target: ResultSource, msg: ChatMessage) => {
    setThreads((t) => ({ ...t, [target]: [...(t[target] ?? []), msg] }))
  }, [])

  const respond = useCallback(
    async (target: ResultSource, question: string) => {
      const prior = threads[target] ?? []
      setPending(true)
      try {
        const e = await generateExplanation(stored.result, prior, question)
        appendTo(target, { role: "assistant", text: e.text, used: e.used })
      } finally {
        setPending(false)
      }
    },
    [appendTo, stored.result, threads]
  )

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || pending) return
      appendTo(source, { role: "user", text })
      setInput("")
      void respond(source, text)
    },
    [appendTo, pending, respond, source]
  )

  const handleToggle = useCallback(
    (checked: boolean) => {
      setEnabled(checked)
      if (checked && (threads[source] ?? []).length === 0) {
        void respond(source, "")
      }
    },
    [respond, source, threads]
  )

  const switchSource = useCallback((next: ResultSource) => {
    setSource(next)
    setPending(false)
  }, [])

  const newChat = useCallback((target: ResultSource) => {
    setInput("")
    setPending(false)
    setThreads((t) => ({ ...t, [target]: [] }))
  }, [])

  // Keep the newest message in view (DOM side effect only — not a setState).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, pending])

  return (
    <div className="bento-grid w-full">
      {/* AI explanation panel — a single glass Card (design.md §3.2/§6, FR-D4).
          Transcript inside is solid `--surface-1` because glass is prohibited
          for dense text (§3.2/§6) and glass-on-glass is banned (§5). */}
      <Card className="bento-full glass accent-bg-ai">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div>
            <CardTitle className="text-headline">AI Explanation</CardTitle>
            <p className="text-caption text-text-tertiary">
              Plain-language commentary on calculated results. Read-only — never alters a computed value.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <Button variant="ghost" size="sm" onClick={() => newChat(source)} disabled={!messages.length || pending}>
              New chat
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-caption text-text-tertiary">Explain</span>
              <Toggle checked={enabled} onCheckedChange={handleToggle} aria-label="Toggle AI explanation" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-5">
          {/* Module source selector */}
          <div className="flex flex-wrap items-center gap-2">
            {SOURCES.map((s) => (
              <PillButton key={s.id} active={source === s.id} onClick={() => switchSource(s.id)}>
                {s.id} · {s.label}
              </PillButton>
            ))}
            <span className="w-full sm:w-auto sm:ml-auto text-micro text-text-tertiary">
              {stored.live
                ? "Reading live results from Module " + source
                : "Sample values (Module " + source + " not run yet)"}
            </span>
          </div>

          {/* Calculated outputs being explained (FR-D4: numbers separated from AI text) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-4">
            {resultStats(stored.result).map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>

          {/* Conversation transcript — solid surface (dense text, §3.2/§6) */}
          <div
            ref={scrollRef}
            className="flex max-h-[22rem] sm:max-h-[26rem] min-h-52 sm:min-h-60 flex-col gap-3 sm:gap-4 overflow-y-auto rounded-lg border border-border-subtle bg-surface-1 p-3.5 sm:p-5"
          >
            {!enabled ? (
              <div className="m-auto max-w-md text-center">
                <p className="text-body text-text-secondary">Toggle &ldquo;Explain&rdquo; to start a conversation.</p>
                <p className="mt-1 text-caption text-text-tertiary">
                  The AI summarises Module {source}&apos;s calculated values and can answer follow-up questions.
                </p>
              </div>
            ) : messages.length === 0 && !pending ? (
              <div className="m-auto max-w-md text-center">
                <p className="text-body text-text-secondary">Ask a question to get started.</p>
                <p className="mt-1 text-caption text-text-tertiary">
                  For example, &ldquo;why is the Q high?&rdquo; or &ldquo;what does the return loss tell me?&rdquo;
                </p>
              </div>
            ) : (
              <>
                {/* Opening explanation from the AI */}
                {rendered.map(({ msg, questionNo }, i) =>
                  msg.role === "assistant" ? (
                    <div key={i} className="flex max-w-[92%] sm:max-w-[80%] flex-col gap-2 self-start">
                      <div className="flex items-center gap-2">
                        <span className="text-micro font-medium text-[var(--accent-ai)]">AI</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] text-[var(--accent-ai)]"
                        >
                          {msg.used === "llm" ? "live" : "template"}
                        </Badge>
                      </div>
                      <div className="rounded-md border border-border-subtle bg-surface-2 p-3 sm:p-4">
                        <p className="text-body leading-relaxed text-text-primary">{msg.text}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex max-w-[92%] sm:max-w-[80%] flex-col items-end gap-1 self-end">
                      <span className="text-micro text-text-tertiary">Question {questionNo}</span>
                      <p className="rounded-md bg-surface-2 px-3 sm:px-4 py-2 sm:py-2.5 text-right text-body leading-relaxed text-text-primary">
                        {msg.text}
                      </p>
                    </div>
                  )
                )}
                {pending && (
                  <div className="flex items-center gap-2">
                    <span className="text-micro font-medium text-[var(--accent-ai)]">AI</span>
                    <span className="text-caption text-text-tertiary">explaining&hellip;</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Composer — solid Input + solid accent Button (§6); glass not used on fields */}
          {enabled && (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about the ${SOURCES.find((s) => s.id === source)?.label.toLowerCase()} result…`}
                aria-label="Follow-up question"
                className="h-9 flex-1 rounded-lg px-3"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send question"
                title="Send question"
                disabled={!input.trim() || pending}
              >
                <SendIcon className="size-4" />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
