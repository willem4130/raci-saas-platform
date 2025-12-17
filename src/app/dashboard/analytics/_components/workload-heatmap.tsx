'use client';

/**
 * Workload Heatmap Component
 *
 * Displays a 2D table visualization of member × role workload.
 * Color intensity indicates workload level:
 * - Red (90%+): Overloaded
 * - Orange (70-89%): High
 * - Yellow (50-69%): Medium
 * - Green (30-49%): Optimal
 * - Gray (<30%): Underutilized
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HeatmapRow } from '@/types/analytics';

interface WorkloadHeatmapProps {
  data: HeatmapRow[];
}

// Color intensity based on workload percentage
function getHeatmapColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500 text-white border-red-600';
  if (percentage >= 70) return 'bg-orange-400 text-white border-orange-500';
  if (percentage >= 50) return 'bg-yellow-300 text-gray-900 border-yellow-400';
  if (percentage >= 30) return 'bg-green-200 text-gray-900 border-green-300';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

export function WorkloadHeatmap({ data }: WorkloadHeatmapProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workload Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">
            No heatmap data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Member assignment distribution by RACI role
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="border p-2 text-left bg-gray-50 font-semibold">Member</th>
                <th className="border p-2 text-center bg-blue-50 font-semibold">
                  R
                </th>
                <th className="border p-2 text-center bg-green-50 font-semibold">
                  A
                </th>
                <th className="border p-2 text-center bg-yellow-50 font-semibold">
                  C
                </th>
                <th className="border p-2 text-center bg-purple-50 font-semibold">
                  I
                </th>
                <th className="border p-2 text-center bg-gray-50 font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const totalAssignments =
                  row.roles.RESPONSIBLE.count +
                  row.roles.ACCOUNTABLE.count +
                  row.roles.CONSULTED.count +
                  row.roles.INFORMED.count;

                return (
                  <tr key={row.memberId} className="border-b hover:bg-gray-50">
                    <td className="border p-2">
                      <div className="font-medium">{row.memberName}</div>
                      {row.jobTitle && (
                        <div className="text-xs text-muted-foreground">
                          {row.jobTitle}
                        </div>
                      )}
                    </td>
                    {/* Responsible */}
                    <td className="border p-2 text-center">
                      {row.roles.RESPONSIBLE.count > 0 ? (
                        <Badge
                          className={cn(
                            'font-semibold',
                            getHeatmapColor(row.roles.RESPONSIBLE.percentage)
                          )}
                        >
                          {row.roles.RESPONSIBLE.count}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* Accountable */}
                    <td className="border p-2 text-center">
                      {row.roles.ACCOUNTABLE.count > 0 ? (
                        <Badge
                          className={cn(
                            'font-semibold',
                            getHeatmapColor(row.roles.ACCOUNTABLE.percentage)
                          )}
                        >
                          {row.roles.ACCOUNTABLE.count}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* Consulted */}
                    <td className="border p-2 text-center">
                      {row.roles.CONSULTED.count > 0 ? (
                        <Badge
                          className={cn(
                            'font-semibold',
                            getHeatmapColor(row.roles.CONSULTED.percentage)
                          )}
                        >
                          {row.roles.CONSULTED.count}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* Informed */}
                    <td className="border p-2 text-center">
                      {row.roles.INFORMED.count > 0 ? (
                        <Badge
                          className={cn(
                            'font-semibold',
                            getHeatmapColor(row.roles.INFORMED.percentage)
                          )}
                        >
                          {row.roles.INFORMED.count}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* Total */}
                    <td className="border p-2 text-center">
                      <div className="font-semibold">{totalAssignments}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.totalWorkload.toFixed(0)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs">
          <span className="font-semibold">Workload Intensity:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
            <span>&lt;30%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-200 border border-green-300 rounded" />
            <span>30-49%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-300 border border-yellow-400 rounded" />
            <span>50-69%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-400 border border-orange-500 rounded" />
            <span>70-89%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 border border-red-600 rounded" />
            <span>≥90%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
