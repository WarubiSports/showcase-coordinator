'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Task, Category } from '@/types'

interface ProgressOverviewProps {
  tasks: Task[]
  categories: Category[]
}

export function ProgressOverview({ tasks, categories }: ProgressOverviewProps) {
  // Overall stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'complete').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length
  const notStartedTasks = tasks.filter((t) => t.status === 'not_started').length
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Progress by category
  const categoryProgress = categories.map((category) => {
    const categoryTasks = tasks.filter((t) => t.category_id === category.id)
    const completed = categoryTasks.filter((t) => t.status === 'complete').length
    const progress = categoryTasks.length > 0 ? Math.round((completed / categoryTasks.length) * 100) : 0

    return {
      ...category,
      total: categoryTasks.length,
      completed,
      progress,
    }
  }).filter((c) => c.total > 0)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedTasks} of {totalTasks} tasks complete
              </span>
              <span className="font-semibold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{notStartedTasks}</div>
              <div className="text-xs text-muted-foreground">Not Started</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress by Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Progress by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
            {categoryProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks assigned to categories yet
              </p>
            ) : (
              categoryProgress.map((category) => (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {category.completed}/{category.total}
                    </span>
                  </div>
                  <Progress
                    value={category.progress}
                    className="h-1.5"
                    style={
                      {
                        '--progress-background': category.color,
                      } as React.CSSProperties
                    }
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
