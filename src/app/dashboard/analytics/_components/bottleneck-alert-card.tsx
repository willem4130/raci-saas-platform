'use client';

/**
 * Bottleneck Alert Card Component
 *
 * Displays a list of overloaded team members (workload > 80%).
 * Shows:
 * - Green success message if no bottlenecks
 * - Orange alert with member details if bottlenecks exist
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users } from 'lucide-react';
import type { BottleneckMember } from '@/types/analytics';

interface BottleneckAlertCardProps {
  bottlenecks: BottleneckMember[];
}

export function BottleneckAlertCard({ bottlenecks }: BottleneckAlertCardProps) {
  if (bottlenecks.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <Users className="h-5 w-5" />
            <span className="font-medium">No bottlenecks detected. Workload is balanced!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          Overloaded Members ({bottlenecks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bottlenecks.map((member) => (
            <div
              key={member.memberId}
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"
            >
              <div>
                <div className="font-medium text-gray-900">{member.memberName}</div>
                <div className="text-sm text-muted-foreground">
                  {member.jobTitle || 'No job title'}
                </div>
                {member.criticalAssignments > 0 && (
                  <Badge variant="destructive" className="text-xs mt-1">
                    {member.criticalAssignments} Critical Tasks
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-orange-700 text-lg">
                  {member.workloadPercentage.toFixed(0)}%
                </div>
                <Badge variant="outline" className="text-xs mt-1">
                  {member.totalAssignments} assignments
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
