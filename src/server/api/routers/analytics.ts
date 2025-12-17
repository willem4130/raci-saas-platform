/**
 * Analytics Router
 *
 * Provides workload analytics, bottleneck identification, task completion tracking,
 * and heatmap data for the RACI SaaS platform.
 *
 * Endpoints:
 * - getOrganizationAnalytics: KPI metrics
 * - getMemberWorkloadDistribution: Chart data for workload distribution
 * - getBottlenecks: Overloaded members identification
 * - getCompletionMetrics: Task status and completion tracking
 * - getRoleHeatmap: 2D member × role visualization data
 */

import { z } from 'zod';
import { createTRPCRouter, organizationProcedure } from '@/server/api/trpc';
import type {
  OrganizationAnalytics,
  MemberWorkloadDistribution,
  BottleneckMember,
  CompletionMetrics,
  HeatmapRow,
} from '@/types/analytics';

export const analyticsRouter = createTRPCRouter({
  /**
   * Get organization-level analytics summary
   * Returns KPI metrics for dashboard cards
   */
  getOrganizationAnalytics: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        matrixId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<OrganizationAnalytics> => {
      // Build base filters
      const baseFilter = {
        matrix: {
          project: {
            organizationId: input.organizationId,
          },
        },
        deletedAt: null,
      };

      const matrixFilter = input.matrixId
        ? { ...baseFilter, matrixId: input.matrixId }
        : baseFilter;

      // Parallel queries for performance
      const [tasks, members, matrices, assignments] = await Promise.all([
        // Total tasks
        ctx.db.task.count({
          where: matrixFilter,
        }),

        // Total active members
        ctx.db.member.count({
          where: {
            organizationId: input.organizationId,
            status: 'ACTIVE',
          },
        }),

        // Total matrices (only count if not filtering by specific matrix)
        input.matrixId
          ? Promise.resolve(1)
          : ctx.db.matrix.count({
              where: {
                project: {
                  organizationId: input.organizationId,
                },
                deletedAt: null,
              },
            }),

        // All assignments for calculation
        ctx.db.assignment.findMany({
          where: {
            ...matrixFilter,
            member: {
              status: 'ACTIVE',
            },
          },
          include: {
            task: {
              select: {
                status: true,
              },
            },
            member: {
              select: {
                id: true,
              },
            },
          },
        }),
      ]);

      // Calculate completion rate
      const uniqueCompletedTasks = new Set(
        assignments
          .filter((a) => a.task.status === 'COMPLETED')
          .map((a) => a.taskId)
      ).size;
      const completionRate =
        tasks > 0 ? Math.round((uniqueCompletedTasks / tasks) * 100) : 0;

      // Calculate assignment distribution by RACI role
      const assignmentDistribution = {
        RESPONSIBLE: assignments.filter((a) => a.raciRole === 'RESPONSIBLE')
          .length,
        ACCOUNTABLE: assignments.filter((a) => a.raciRole === 'ACCOUNTABLE')
          .length,
        CONSULTED: assignments.filter((a) => a.raciRole === 'CONSULTED')
          .length,
        INFORMED: assignments.filter((a) => a.raciRole === 'INFORMED').length,
      };

      // Calculate overloaded members (workload > 80%)
      const memberWorkloads = new Map<string, number>();
      assignments.forEach((a) => {
        const current = memberWorkloads.get(a.member.id) || 0;
        memberWorkloads.set(a.member.id, current + (a.workload || 25)); // Default 25% if not specified
      });

      const overloadedMembers = Array.from(memberWorkloads.values()).filter(
        (w) => w > 80
      ).length;

      return {
        totalTasks: tasks,
        totalMembers: members,
        totalMatrices: matrices,
        completionRate,
        overloadedMembers,
        assignmentDistribution,
      };
    }),

  /**
   * Get workload distribution per member
   * Returns data for bar/stacked chart visualization
   */
  getMemberWorkloadDistribution: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        matrixId: z.string().optional(),
      })
    )
    .query(
      async ({ ctx, input }): Promise<MemberWorkloadDistribution[]> => {
        // Get all active members in the organization
        const members = await ctx.db.member.findMany({
          where: {
            organizationId: input.organizationId,
            status: 'ACTIVE',
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        });

        // Get all assignments for these members
        const assignments = await ctx.db.assignment.findMany({
          where: {
            memberId: {
              in: members.map((m) => m.id),
            },
            matrix: {
              project: {
                organizationId: input.organizationId,
              },
            },
            deletedAt: null,
            ...(input.matrixId && { matrixId: input.matrixId }),
          },
          include: {
            task: {
              select: {
                status: true,
              },
            },
          },
        });

        // Aggregate workload per member
        return members.map((member) => {
          const memberAssignments = assignments.filter(
            (a) => a.memberId === member.id
          );

          const responsible = memberAssignments.filter(
            (a) => a.raciRole === 'RESPONSIBLE'
          ).length;
          const accountable = memberAssignments.filter(
            (a) => a.raciRole === 'ACCOUNTABLE'
          ).length;
          const consulted = memberAssignments.filter(
            (a) => a.raciRole === 'CONSULTED'
          ).length;
          const informed = memberAssignments.filter(
            (a) => a.raciRole === 'INFORMED'
          ).length;

          const totalWorkload = memberAssignments.reduce(
            (sum, a) => sum + (a.workload || 25),
            0
          );

          const activeTaskCount = memberAssignments.filter(
            (a) => a.task.status !== 'COMPLETED'
          ).length;

          return {
            memberId: member.id,
            memberName: member.user.name || 'Unnamed Member',
            jobTitle: member.jobTitle,
            responsible,
            accountable,
            consulted,
            informed,
            totalWorkload,
            activeTaskCount,
          };
        });
      }
    ),

  /**
   * Get bottleneck members (overloaded)
   * Returns members with workload exceeding threshold
   */
  getBottlenecks: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        matrixId: z.string().optional(),
        threshold: z.number().min(0).max(100).default(80),
      })
    )
    .query(async ({ ctx, input }): Promise<BottleneckMember[]> => {
      // Get all active members with their assignments
      const members = await ctx.db.member.findMany({
        where: {
          organizationId: input.organizationId,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          assignments: {
            where: {
              matrix: {
                project: {
                  organizationId: input.organizationId,
                },
              },
              deletedAt: null,
              ...(input.matrixId && { matrixId: input.matrixId }),
            },
            include: {
              task: {
                select: {
                  priority: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      // Calculate workload and identify bottlenecks
      const bottlenecks: BottleneckMember[] = members
        .map((member) => {
          const totalWorkload = member.assignments.reduce(
            (sum, a) => sum + (a.workload || 25),
            0
          );

          const criticalAssignments = member.assignments.filter(
            (a) => a.task.priority === 'CRITICAL'
          ).length;

          const blockedTaskCount = member.assignments.filter(
            (a) => a.task.status === 'BLOCKED'
          ).length;

          return {
            memberId: member.id,
            memberName: member.user.name || 'Unnamed Member',
            jobTitle: member.jobTitle,
            totalAssignments: member.assignments.length,
            criticalAssignments,
            workloadPercentage: totalWorkload,
            blockedTaskCount,
          };
        })
        .filter((m) => m.workloadPercentage > input.threshold)
        .sort((a, b) => b.workloadPercentage - a.workloadPercentage); // Sort by workload descending

      return bottlenecks;
    }),

  /**
   * Get task completion metrics
   * Returns completion rate, status distribution, and priority breakdown
   */
  getCompletionMetrics: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        matrixId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<CompletionMetrics> => {
      const baseFilter = {
        matrix: {
          project: {
            organizationId: input.organizationId,
          },
        },
        deletedAt: null,
      };

      const matrixFilter = input.matrixId
        ? { ...baseFilter, matrixId: input.matrixId }
        : baseFilter;

      // Get all tasks with their status and priority
      const tasks = await ctx.db.task.findMany({
        where: matrixFilter,
        select: {
          id: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Count by status
      const completedTasks = tasks.filter(
        (t) => t.status === 'COMPLETED'
      ).length;
      const inProgressTasks = tasks.filter(
        (t) => t.status === 'IN_PROGRESS'
      ).length;
      const notStartedTasks = tasks.filter(
        (t) => t.status === 'NOT_STARTED'
      ).length;
      const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
      const onHoldTasks = tasks.filter((t) => t.status === 'ON_HOLD').length;

      // Calculate completion rate
      const completionRate =
        tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

      // Calculate average completion time (simplified - using updatedAt as proxy for completedAt)
      const completedTasksWithTime = tasks.filter(
        (t) => t.status === 'COMPLETED'
      );
      const averageCompletionTime =
        completedTasksWithTime.length > 0
          ? completedTasksWithTime.reduce((sum, t) => {
              const days = Math.floor(
                (t.updatedAt.getTime() - t.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return sum + days;
            }, 0) / completedTasksWithTime.length
          : null;

      // Group by priority
      const byPriority = {
        CRITICAL: {
          total: tasks.filter((t) => t.priority === 'CRITICAL').length,
          completed: tasks.filter(
            (t) => t.priority === 'CRITICAL' && t.status === 'COMPLETED'
          ).length,
        },
        HIGH: {
          total: tasks.filter((t) => t.priority === 'HIGH').length,
          completed: tasks.filter(
            (t) => t.priority === 'HIGH' && t.status === 'COMPLETED'
          ).length,
        },
        MEDIUM: {
          total: tasks.filter((t) => t.priority === 'MEDIUM').length,
          completed: tasks.filter(
            (t) => t.priority === 'MEDIUM' && t.status === 'COMPLETED'
          ).length,
        },
        LOW: {
          total: tasks.filter((t) => t.priority === 'LOW').length,
          completed: tasks.filter(
            (t) => t.priority === 'LOW' && t.status === 'COMPLETED'
          ).length,
        },
      };

      return {
        totalTasks: tasks.length,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        blockedTasks,
        onHoldTasks,
        completionRate,
        averageCompletionTime: averageCompletionTime
          ? Math.round(averageCompletionTime * 10) / 10
          : null,
        byPriority,
      };
    }),

  /**
   * Get heatmap data (member × role matrix)
   * Returns aggregated assignment counts per member per role
   */
  getRoleHeatmap: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        matrixId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<HeatmapRow[]> => {
      // Get all active members
      const members = await ctx.db.member.findMany({
        where: {
          organizationId: input.organizationId,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          assignments: {
            where: {
              matrix: {
                project: {
                  organizationId: input.organizationId,
                },
              },
              deletedAt: null,
              ...(input.matrixId && { matrixId: input.matrixId }),
            },
          },
        },
      });

      // Aggregate by member and role
      return members.map((member) => {
        const roles = {
          RESPONSIBLE: {
            count: member.assignments.filter((a) => a.raciRole === 'RESPONSIBLE')
              .length,
            percentage: member.assignments
              .filter((a) => a.raciRole === 'RESPONSIBLE')
              .reduce((sum, a) => sum + (a.workload || 25), 0),
          },
          ACCOUNTABLE: {
            count: member.assignments.filter((a) => a.raciRole === 'ACCOUNTABLE')
              .length,
            percentage: member.assignments
              .filter((a) => a.raciRole === 'ACCOUNTABLE')
              .reduce((sum, a) => sum + (a.workload || 25), 0),
          },
          CONSULTED: {
            count: member.assignments.filter((a) => a.raciRole === 'CONSULTED')
              .length,
            percentage: member.assignments
              .filter((a) => a.raciRole === 'CONSULTED')
              .reduce((sum, a) => sum + (a.workload || 25), 0),
          },
          INFORMED: {
            count: member.assignments.filter((a) => a.raciRole === 'INFORMED')
              .length,
            percentage: member.assignments
              .filter((a) => a.raciRole === 'INFORMED')
              .reduce((sum, a) => sum + (a.workload || 25), 0),
          },
        };

        const totalWorkload = member.assignments.reduce(
          (sum, a) => sum + (a.workload || 25),
          0
        );

        return {
          memberId: member.id,
          memberName: member.user.name || 'Unnamed Member',
          jobTitle: member.jobTitle,
          roles,
          totalWorkload,
        };
      });
    }),
});
