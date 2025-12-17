'use client';

/**
 * Completion Tracking Card Component
 *
 * Displays task completion metrics with a pie chart visualization.
 * Shows:
 * - Completion rate percentage in header
 * - Pie chart with task status distribution
 * - Color-coded segments: Completed (green), In Progress (blue), Not Started (gray), Blocked (red), On Hold (yellow)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { CompletionMetrics } from '@/types/analytics';

interface CompletionTrackingCardProps {
  metrics: CompletionMetrics;
}

const TASK_COLORS = {
  completed: '#22c55e',
  inProgress: '#3b82f6',
  notStarted: '#94a3b8',
  blocked: '#ef4444',
  onHold: '#eab308',
};

export function CompletionTrackingCard({ metrics }: CompletionTrackingCardProps) {
  const chartData = [
    { name: 'Completed', value: metrics.completedTasks, color: TASK_COLORS.completed },
    { name: 'In Progress', value: metrics.inProgressTasks, color: TASK_COLORS.inProgress },
    { name: 'Not Started', value: metrics.notStartedTasks, color: TASK_COLORS.notStarted },
    { name: 'Blocked', value: metrics.blockedTasks, color: TASK_COLORS.blocked },
    { name: 'On Hold', value: metrics.onHoldTasks, color: TASK_COLORS.onHold },
  ].filter((item) => item.value > 0); // Only show non-zero segments

  // Custom label renderer
  const renderLabel = (entry: { value?: number; name?: string }) => {
    if (!entry.value || !entry.name) return '';
    const percent = ((entry.value / metrics.totalTasks) * 100).toFixed(0);
    return `${entry.name}: ${percent}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Completion</CardTitle>
        <div className="text-3xl font-bold text-green-600 mt-2">
          {metrics.completionRate}%
        </div>
        <p className="text-sm text-muted-foreground">
          {metrics.completedTasks} of {metrics.totalTasks} tasks completed
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px',
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="square"
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No task data available
          </div>
        )}

        {/* Priority Breakdown */}
        {metrics.byPriority && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold mb-3">Completion by Priority</h4>
            <div className="space-y-2">
              {Object.entries(metrics.byPriority).map(([priority, data]) => {
                if (data.total === 0) return null;
                const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                return (
                  <div key={priority} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{priority}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {data.completed}/{data.total}
                      </span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="font-medium w-10 text-right">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
