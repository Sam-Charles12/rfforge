"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ModulePlaceholderProps {
  code: string
  title: string
  description: string
  accentClass: string
}

export function ModulePlaceholder({ code, title, description, accentClass }: ModulePlaceholderProps) {
  return (
    <Card className={`bento-full glass ${accentClass}`}>
      <CardHeader>
        <CardTitle className="text-title">
          Module {code} — {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-body text-text-secondary">{description}</p>
        <p className="text-caption mt-4 text-text-tertiary">
          This module is not yet implemented. Per the PRD build order, Module B ships first.
        </p>
      </CardContent>
    </Card>
  )
}
