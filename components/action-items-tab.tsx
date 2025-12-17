import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

const actionItems = [
  {
    id: "1",
    task: "Fix API endpoint response time optimization",
    assignee: "Rizky",
    priority: "high",
    completed: false,
  },
  {
    id: "2",
    task: "Deliver mobile app design mockups",
    assignee: "Siti",
    priority: "high",
    completed: false,
  },
  {
    id: "3",
    task: "Schedule payment gateway integration kickoff",
    assignee: "Rizky",
    priority: "medium",
    completed: false,
  },
  {
    id: "4",
    task: "Update Q3 OKRs with new performance targets",
    assignee: "Budi",
    priority: "medium",
    completed: false,
  },
  {
    id: "5",
    task: "Coordinate with design team on timeline",
    assignee: "Siti",
    priority: "low",
    completed: true,
  },
]

export function ActionItemsTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {actionItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
            >
              <Checkbox id={item.id} defaultChecked={item.completed} className="mt-0.5" />
              <div className="flex-1 space-y-2">
                <label
                  htmlFor={item.id}
                  className={`block cursor-pointer text-sm font-medium leading-relaxed ${
                    item.completed ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {item.task}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    @{item.assignee}
                  </Badge>
                  <Badge
                    variant={
                      item.priority === "high" ? "destructive" : item.priority === "medium" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {item.priority === "high" && "High Priority"}
                    {item.priority === "medium" && "Medium"}
                    {item.priority === "low" && "Low"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
