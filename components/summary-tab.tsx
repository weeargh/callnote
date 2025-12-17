"use client"

import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"

interface SummaryTabProps {
  summary?: string | null
  languageStats?: { en: number; id: number } | null
}

export function SummaryTab({ summary, languageStats }: SummaryTabProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (summary) {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Summary is being generated...</p>
            <p className="mt-2 text-sm">This may take a few moments.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">Meeting Summary</h3>
            {languageStats && (
              <span className="text-xs text-muted-foreground">
                ({languageStats.en}% EN / {languageStats.id}% ID)
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>

        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {summary}
        </div>
      </CardContent>
    </Card>
  )
}
