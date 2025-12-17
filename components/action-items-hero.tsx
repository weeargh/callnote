"use client"

import { CheckCircle2, Circle, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { ActionItem } from "@/lib/supabase"

interface ActionItemsHeroProps {
  actionItems: ActionItem[]
  onToggleComplete?: (id: string, completed: boolean) => void
}

export function ActionItemsHero({ actionItems, onToggleComplete }: ActionItemsHeroProps) {
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(
    new Set(actionItems.filter(item => item.is_completed).map(item => item.id))
  )
  const [copied, setCopied] = useState(false)

  const toggleComplete = async (id: string) => {
    const newCompleted = new Set(localCompleted)
    const isCompleted = newCompleted.has(id)

    if (isCompleted) {
      newCompleted.delete(id)
    } else {
      newCompleted.add(id)
    }
    setLocalCompleted(newCompleted)

    // Call API to update
    if (onToggleComplete) {
      onToggleComplete(id, !isCompleted)
    }

    try {
      await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !isCompleted }),
      })
    } catch (error) {
      console.error('Error updating action item:', error)
      // Revert on error
      if (isCompleted) {
        newCompleted.add(id)
      } else {
        newCompleted.delete(id)
      }
      setLocalCompleted(newCompleted)
    }
  }

  const handleCopy = () => {
    const text = actionItems.map(item => {
      const isCompleted = localCompleted.has(item.id)
      const status = isCompleted ? '[x]' : '[ ]'
      const assignee = item.assignee ? ` @${item.assignee}` : ''
      return `- ${status} ${item.task}${assignee}`
    }).join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const completedCount = localCompleted.size
  const totalCount = actionItems.length

  if (actionItems.length === 0) {
    return null
  }

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Action Items</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy to Do List'}
        </Button>
      </div>

      <div className="space-y-2">
        {actionItems.map((item) => {
          const isCompleted = localCompleted.has(item.id)
          return (
            <div
              key={item.id}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <button onClick={() => toggleComplete(item.id)} className="mt-0.5 transition-transform hover:scale-110">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-relaxed ${isCompleted ? "text-muted-foreground line-through" : "text-foreground font-medium"
                    }`}
                >
                  {item.task}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {item.assignee && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      @{item.assignee}
                    </Badge>
                  )}
                  {item.priority === "High" && (
                    <Badge variant="destructive" className="text-xs">
                      High Priority
                    </Badge>
                  )}
                  {item.priority === "Medium" && (
                    <Badge variant="default" className="text-xs">
                      Medium
                    </Badge>
                  )}
                  {item.priority === "Low" && (
                    <Badge variant="secondary" className="text-xs">
                      Low
                    </Badge>
                  )}
                  {item.timestamp_ref && (
                    <span className="text-xs text-muted-foreground">{item.timestamp_ref}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
