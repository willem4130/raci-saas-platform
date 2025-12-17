/**
 * Analytics Type Definitions
 *
 * TypeScript interfaces for workload analytics, bottleneck identification,
 * and task completion metrics
 */

export type RaciRole = 'RESPONSIBLE' | 'ACCOUNTABLE' | 'CONSULTED' | 'INFORMED';

/**
 * Organization-level analytics summary
 */
export interface OrganizationAnalytics {
  totalTasks: number;
  totalMembers: number;
  totalMatrices: number;
  completionRate: number; // Percentage (0-100)
  overloadedMembers: number; // Count of members over threshold
  assignmentDistribution: {
    RESPONSIBLE: number;
    ACCOUNTABLE: number;
    CONSULTED: number;
    INFORMED: number;
  };
}

/**
 * Workload distribution per team member
 */
export interface MemberWorkloadDistribution {
  memberId: string;
  memberName: string;
  jobTitle: string | null;
  responsible: number; // Count of R assignments
  accountable: number; // Count of A assignments
  consulted: number; // Count of C assignments
  informed: number; // Count of I assignments
  totalWorkload: number; // Sum of workload percentages (0-100 per assignment)
  activeTaskCount: number; // Count of non-completed tasks
}

/**
 * Bottleneck member (overloaded)
 */
export interface BottleneckMember {
  memberId: string;
  memberName: string;
  jobTitle: string | null;
  totalAssignments: number;
  criticalAssignments: number; // Count of CRITICAL priority tasks
  workloadPercentage: number; // Calculated based on assignments
  blockedTaskCount: number; // Count of BLOCKED status tasks
}

/**
 * Task completion metrics
 */
export interface CompletionMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  blockedTasks: number;
  onHoldTasks: number;
  completionRate: number; // Percentage (0-100)
  averageCompletionTime: number | null; // Days (calculated from createdAt to completedAt)
  byPriority: {
    CRITICAL: { total: number; completed: number };
    HIGH: { total: number; completed: number };
    MEDIUM: { total: number; completed: number };
    LOW: { total: number; completed: number };
  };
}

/**
 * Heatmap cell data (member × role intersection)
 */
export interface HeatmapCell {
  memberId: string;
  memberName: string;
  raciRole: RaciRole;
  count: number; // Number of assignments for this role
  workloadPercentage: number; // Sum of workload % for this role
}

/**
 * Grouped heatmap data (for table rendering)
 */
export interface HeatmapRow {
  memberId: string;
  memberName: string;
  jobTitle: string | null;
  roles: {
    RESPONSIBLE: { count: number; percentage: number };
    ACCOUNTABLE: { count: number; percentage: number };
    CONSULTED: { count: number; percentage: number };
    INFORMED: { count: number; percentage: number };
  };
  totalWorkload: number;
}

/**
 * Time-series trend data point (for Phase 4)
 */
export interface AnalyticsTrendPoint {
  date: Date;
  completedTasks: number;
  newAssignments: number;
  avgWorkload: number;
}

/**
 * Analytics filter options
 */
export interface AnalyticsFilters {
  organizationId: string;
  matrixId?: string; // Optional: filter to specific matrix
  timeRange?: '7d' | '30d' | '90d' | 'all';
  threshold?: number; // For bottleneck detection (default: 80)
}
