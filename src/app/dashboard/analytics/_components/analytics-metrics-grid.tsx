'use client';

/**
 * Analytics Metrics Grid Component
 *
 * Displays 4 KPI cards:
 * - Total Tasks
 * - Completion Rate %
 * - Active Members
 * - Overloaded Members
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, CheckCircle2, Users, AlertTriangle } from 'lucide-react';

interface AnalyticsMetricsGridProps {
  totalTasks: number;
  completionRate: number;
  activeMembers: number;
  overloadedCount: number;
}

export function AnalyticsMetricsGrid({
  totalTasks,
  completionRate,
  activeMembers,
  overloadedCount,
}: AnalyticsMetricsGridProps) {
  const metrics = [
    {
      title: 'Total Tasks',
      value: totalTasks,
      icon: ListTodo,
      description: 'Across all matrices',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: CheckCircle2,
      description: 'Tasks completed',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Members',
      value: activeMembers,
      icon: Users,
      description: 'Team members',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Overloaded',
      value: overloadedCount,
      icon: AlertTriangle,
      description: 'Members over 80% capacity',
      color: overloadedCount > 0 ? 'text-orange-600' : 'text-green-600',
      bgColor: overloadedCount > 0 ? 'bg-orange-50' : 'bg-green-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className={metric.bgColor}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
