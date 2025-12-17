'use client';

/**
 * Analytics Dashboard Page
 *
 * Displays comprehensive workload analytics including:
 * - KPI metrics (total tasks, completion rate, active members, overloaded members)
 * - Workload distribution chart (RACI roles per member)
 * - Bottleneck identification (overloaded team members)
 * - Task completion tracking (status distribution)
 * - Workload heatmap (member × role matrix)
 * - Export functionality (PDF/CSV)
 */

import { useState } from 'react';
import { api } from '@/lib/trpc/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnalyticsMetricsGrid } from './_components/analytics-metrics-grid';
import { WorkloadDistributionChart } from './_components/workload-distribution-chart';
import { BottleneckAlertCard } from './_components/bottleneck-alert-card';
import { CompletionTrackingCard } from './_components/completion-tracking-card';
import { WorkloadHeatmap } from './_components/workload-heatmap';
import { ExportAnalyticsDialog } from './_components/export-analytics-dialog';

export default function AnalyticsPage() {
  const [selectedMatrixId] = useState<string | undefined>();

  // Fetch user's organizations to get the organization ID
  const { data: organizations } = api.organization.list.useQuery();

  // Use the first organization by default (multi-org selector can be added later)
  const organizationId = organizations?.[0]?.id;

  // Skip analytics queries if no organization is available
  const skipQueries = !organizationId;

  // Fetch analytics data (skip if no organization)
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = api.analytics.getOrganizationAnalytics.useQuery(
    {
      organizationId: organizationId!,
      matrixId: selectedMatrixId,
    },
    { enabled: !skipQueries }
  );

  const {
    data: workloadData,
    isLoading: workloadLoading,
  } = api.analytics.getMemberWorkloadDistribution.useQuery(
    {
      organizationId: organizationId!,
      matrixId: selectedMatrixId,
    },
    { enabled: !skipQueries }
  );

  const {
    data: bottlenecks,
    isLoading: bottlenecksLoading,
  } = api.analytics.getBottlenecks.useQuery(
    {
      organizationId: organizationId!,
      matrixId: selectedMatrixId,
      threshold: 80,
    },
    { enabled: !skipQueries }
  );

  const {
    data: completionMetrics,
    isLoading: completionLoading,
  } = api.analytics.getCompletionMetrics.useQuery(
    {
      organizationId: organizationId!,
      matrixId: selectedMatrixId,
    },
    { enabled: !skipQueries }
  );

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
  } = api.analytics.getRoleHeatmap.useQuery(
    {
      organizationId: organizationId!,
      matrixId: selectedMatrixId,
    },
    { enabled: !skipQueries }
  );

  // Loading state
  const isLoading =
    analyticsLoading ||
    workloadLoading ||
    bottlenecksLoading ||
    completionLoading ||
    heatmapLoading;

  // Error state
  if (analyticsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Workload analysis and team performance metrics
          </p>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-red-700">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Failed to load analytics</h3>
                <p className="text-sm mt-1">{analyticsError.message}</p>
                <Button
                  onClick={() => refetchAnalytics()}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Workload analysis and team performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* TODO: Add matrix selector dropdown */}
          {/* <Select value={selectedMatrixId} onValueChange={setSelectedMatrixId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Matrices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Matrices</SelectItem>
            </SelectContent>
          </Select> */}

          {!isLoading && analytics && workloadData && (
            <ExportAnalyticsDialog
              analytics={analytics}
              workloadData={workloadData}
              bottlenecks={bottlenecks || []}
            />
          )}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <AnalyticsMetricsGrid
          totalTasks={analytics.totalTasks}
          completionRate={analytics.completionRate}
          activeMembers={analytics.totalMembers}
          overloadedCount={analytics.overloadedMembers}
        />
      ) : null}

      {/* Main Content Grid - Two Columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Workload Distribution Chart */}
          {workloadLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : workloadData && workloadData.length > 0 ? (
            <WorkloadDistributionChart data={workloadData} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-12">
                  No workload data available
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bottleneck Alert */}
          {bottlenecksLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : bottlenecks ? (
            <BottleneckAlertCard bottlenecks={bottlenecks} />
          ) : null}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Completion Tracking */}
          {completionLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : completionMetrics ? (
            <CompletionTrackingCard metrics={completionMetrics} />
          ) : null}

          {/* Workload Heatmap */}
          {heatmapLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : heatmapData && heatmapData.length > 0 ? (
            <WorkloadHeatmap data={heatmapData} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-12">
                  No heatmap data available
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
