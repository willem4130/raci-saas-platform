/**
 * Assignment Router
 *
 * Handles RACI role assignments with validation rules:
 * - Exactly 1 Accountable (A) per task (ERROR)
 * - At least 1 Responsible (R) per task (WARNING)
 * - No duplicate assignments
 */

import { z } from 'zod';
import {
  createTRPCRouter,
  matrixProcedure,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { createAuditLog } from '@/lib/audit';
import { validateAssignment, validateTaskAssignments } from '@/lib/validation/raci-rules';

export const assignmentRouter = createTRPCRouter({
  /**
   * List all assignments in a matrix
   */
  list: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        taskId: z.string().optional(),
        memberId: z.string().optional(),
        raciRole: z
          .enum(['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.assignment.findMany({
        where: {
          matrixId: input.matrixId,
          deletedAt: null,
          ...(input.taskId && { taskId: input.taskId }),
          ...(input.memberId && { memberId: input.memberId }),
          ...(input.raciRole && { raciRole: input.raciRole }),
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              status: true,
              priority: true,
            },
          },
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });
    }),

  /**
   * Get a specific assignment by ID
   */
  getById: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        assignmentId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: {
          id: input.assignmentId,
          matrixId: input.matrixId,
        },
        include: {
          task: true,
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        });
      }

      return assignment;
    }),

  /**
   * Create a new assignment with validation
   */
  create: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        taskId: z.string(),
        memberId: z.string(),
        raciRole: z.enum(['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED']),
        notes: z.string().max(1000).optional(),
        workload: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify task exists in this matrix
      const task = await ctx.db.task.findUnique({
        where: {
          id: input.taskId,
          matrixId: input.matrixId,
          deletedAt: null,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Verify member exists in the organization
      const member = await ctx.db.member.findUnique({
        where: {
          id: input.memberId,
          organizationId: ctx.organizationId,
        },
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Validate assignment against RACI rules
      const validation = await validateAssignment(
        input.taskId,
        input.memberId,
        input.raciRole
      );

      if (!validation.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.error ?? 'Assignment validation failed',
        });
      }

      // Create assignment
      const assignment = await ctx.db.assignment.create({
        data: {
          matrixId: input.matrixId,
          taskId: input.taskId,
          memberId: input.memberId,
          raciRole: input.raciRole,
          notes: input.notes ?? null,
          workload: input.workload ?? null,
          assignedBy: ctx.session.user.id,
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
            },
          },
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'CREATE_ASSIGNMENT',
        resourceType: 'ASSIGNMENT',
        resourceId: assignment.id,
        changes: {
          created: {
            taskId: input.taskId,
            taskName: task.name,
            memberId: input.memberId,
            raciRole: input.raciRole,
          },
        },
      });

      return assignment;
    }),

  /**
   * Update an assignment
   */
  update: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        assignmentId: z.string(),
        raciRole: z
          .enum(['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'])
          .optional(),
        notes: z.string().max(1000).optional(),
        workload: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.assignment.findUnique({
        where: {
          id: input.assignmentId,
          matrixId: input.matrixId,
        },
      });

      if (!before) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        });
      }

      // If changing role, validate
      if (input.raciRole && input.raciRole !== before.raciRole) {
        const validation = await validateAssignment(
          before.taskId,
          before.memberId,
          input.raciRole,
          { excludeAssignmentId: input.assignmentId }
        );

        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validation.error ?? 'Assignment validation failed',
          });
        }
      }

      const assignment = await ctx.db.assignment.update({
        where: { id: input.assignmentId },
        data: {
          ...(input.raciRole && { raciRole: input.raciRole }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.workload !== undefined && { workload: input.workload }),
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
            },
          },
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'UPDATE_ASSIGNMENT',
        resourceType: 'ASSIGNMENT',
        resourceId: assignment.id,
        changes: {
          before: {
            raciRole: before.raciRole,
            notes: before.notes,
            workload: before.workload,
          },
          after: {
            raciRole: assignment.raciRole,
            notes: assignment.notes,
            workload: assignment.workload,
          },
        },
      });

      return assignment;
    }),

  /**
   * Delete an assignment (soft delete)
   */
  delete: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        assignmentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: {
          id: input.assignmentId,
          matrixId: input.matrixId,
        },
        include: {
          task: true,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        });
      }

      // Check if this is the only Accountable - warn but allow
      if (assignment.raciRole === 'ACCOUNTABLE') {
        const accountableCount = await ctx.db.assignment.count({
          where: {
            taskId: assignment.taskId,
            raciRole: 'ACCOUNTABLE',
            deletedAt: null,
          },
        });

        if (accountableCount === 1) {
          // This is the last Accountable - the task will have a validation error
          // We allow this but the UI should show warnings
        }
      }

      const deleted = await ctx.db.assignment.update({
        where: { id: input.assignmentId },
        data: {
          deletedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'DELETE_ASSIGNMENT',
        resourceType: 'ASSIGNMENT',
        resourceId: deleted.id,
        changes: {
          deleted: {
            taskId: assignment.taskId,
            taskName: assignment.task.name,
            raciRole: assignment.raciRole,
          },
        },
      });

      return deleted;
    }),

  /**
   * Bulk create assignments
   */
  bulkCreate: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        assignments: z.array(
          z.object({
            taskId: z.string(),
            memberId: z.string(),
            raciRole: z.enum([
              'RESPONSIBLE',
              'ACCOUNTABLE',
              'CONSULTED',
              'INFORMED',
            ]),
            notes: z.string().max(1000).optional(),
            workload: z.number().min(0).max(100).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate all assignments first
      const validationErrors: string[] = [];

      for (const assignment of input.assignments) {
        const validation = await validateAssignment(
          assignment.taskId,
          assignment.memberId,
          assignment.raciRole
        );

        if (!validation.isValid) {
          validationErrors.push(
            `Task ${assignment.taskId}: ${validation.error}`
          );
        }
      }

      if (validationErrors.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Validation errors:\n${validationErrors.join('\n')}`,
        });
      }

      // Create all assignments in transaction
      const assignments = await ctx.db.$transaction(
        input.assignments.map((assignment) =>
          ctx.db.assignment.create({
            data: {
              matrixId: input.matrixId,
              taskId: assignment.taskId,
              memberId: assignment.memberId,
              raciRole: assignment.raciRole,
              notes: assignment.notes ?? null,
              workload: assignment.workload ?? null,
              assignedBy: ctx.session.user.id,
            },
          })
        )
      );

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'BULK_ASSIGN',
        resourceType: 'ASSIGNMENT',
        resourceId: input.matrixId,
        changes: {
          created: {
            count: assignments.length,
          },
        },
      });

      return assignments;
    }),

  /**
   * Validate assignments for a specific task
   */
  validateTask: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        taskId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: {
          id: input.taskId,
          matrixId: input.matrixId,
        },
        include: {
          assignments: {
            where: {
              deletedAt: null,
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      return validateTaskAssignments(task);
    }),

  /**
   * Get assignment statistics for a member
   */
  getMemberStats: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        memberId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.assignment.findMany({
        where: {
          matrixId: input.matrixId,
          memberId: input.memberId,
          deletedAt: null,
        },
        include: {
          task: {
            select: {
              status: true,
              priority: true,
            },
          },
        },
      });

      const byRole = {
        RESPONSIBLE: assignments.filter((a) => a.raciRole === 'RESPONSIBLE')
          .length,
        ACCOUNTABLE: assignments.filter((a) => a.raciRole === 'ACCOUNTABLE')
          .length,
        CONSULTED: assignments.filter((a) => a.raciRole === 'CONSULTED').length,
        INFORMED: assignments.filter((a) => a.raciRole === 'INFORMED').length,
      };

      const byPriority = {
        CRITICAL: assignments.filter((a) => a.task.priority === 'CRITICAL')
          .length,
        HIGH: assignments.filter((a) => a.task.priority === 'HIGH').length,
        MEDIUM: assignments.filter((a) => a.task.priority === 'MEDIUM').length,
        LOW: assignments.filter((a) => a.task.priority === 'LOW').length,
      };

      const totalWorkload = assignments.reduce(
        (sum, a) => sum + (a.workload ?? 0),
        0
      );

      return {
        totalAssignments: assignments.length,
        byRole,
        byPriority,
        totalWorkload,
      };
    }),
});
