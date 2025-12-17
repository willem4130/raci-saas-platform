/**
 * Matrix Router
 *
 * Handles RACI matrix CRUD operations, grid data fetching,
 * and matrix-level operations like template application and export.
 */

import { z } from 'zod';
import {
  createTRPCRouter,
  projectProcedure,
  matrixProcedure,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { createAuditLog } from '@/lib/audit';
import { validateMatrix, getValidationSummary } from '@/lib/validation/raci-rules';

export const matrixRouter = createTRPCRouter({
  /**
   * List all matrices in a project
   */
  list: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        includeArchived: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.matrix.findMany({
        where: {
          projectId: input.projectId,
          ...(input.includeArchived ? {} : { archivedAt: null }),
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              tasks: true,
              assignments: true,
              comments: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }),

  /**
   * Get a specific matrix by ID
   */
  getById: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const matrix = await ctx.db.matrix.findUnique({
        where: { id: input.matrixId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              organizationId: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              assignments: true,
              comments: true,
            },
          },
        },
      });

      if (!matrix) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Matrix not found',
        });
      }

      return matrix;
    }),

  /**
   * Get complete matrix grid data (tasks, members, assignments)
   * Optimized for rendering the RACI matrix grid
   */
  getGridData: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch all data in parallel for performance
      const [matrix, tasks, members, assignments, taskGroups, validation] =
        await Promise.all([
          ctx.db.matrix.findUnique({
            where: { id: input.matrixId },
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  organizationId: true,
                },
              },
            },
          }),
          ctx.db.task.findMany({
            where: {
              matrixId: input.matrixId,
              deletedAt: null,
            },
            orderBy: [{ orderIndex: 'asc' }],
            include: {
              taskGroupMembers: {
                include: {
                  taskGroup: true,
                },
              },
            },
          }),
          ctx.db.member.findMany({
            where: {
              organizationId: ctx.organizationId,
              status: 'ACTIVE',
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
          }),
          ctx.db.assignment.findMany({
            where: {
              matrixId: input.matrixId,
              deletedAt: null,
            },
          }),
          ctx.db.taskGroup.findMany({
            where: {
              matrixId: input.matrixId,
            },
            include: {
              _count: {
                select: {
                  members: true,
                },
              },
            },
          }),
          getValidationSummary(input.matrixId),
        ]);

      if (!matrix) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Matrix not found',
        });
      }

      return {
        matrix,
        tasks,
        members,
        assignments,
        taskGroups,
        validation,
      };
    }),

  /**
   * Create a new matrix
   */
  create: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        templateId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const matrix = await ctx.db.matrix.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description ?? null,
          templateId: input.templateId ?? null,
          version: 1,
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'CREATE_MATRIX',
        resourceType: 'MATRIX',
        resourceId: matrix.id,
        changes: {
          created: {
            name: matrix.name,
            projectId: matrix.projectId,
          },
        },
      });

      return matrix;
    }),

  /**
   * Update a matrix
   */
  update: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.matrix.findUnique({
        where: { id: input.matrixId },
      });

      if (!before) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Matrix not found',
        });
      }

      const matrix = await ctx.db.matrix.update({
        where: { id: input.matrixId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          version: before.version + 1,
          updatedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'UPDATE_MATRIX',
        resourceType: 'MATRIX',
        resourceId: matrix.id,
        changes: {
          before: {
            name: before.name,
            description: before.description,
          },
          after: {
            name: matrix.name,
            description: matrix.description,
          },
        },
      });

      return matrix;
    }),

  /**
   * Archive a matrix (soft delete)
   */
  archive: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const matrix = await ctx.db.matrix.update({
        where: { id: input.matrixId },
        data: {
          archivedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'ARCHIVE_MATRIX',
        resourceType: 'MATRIX',
        resourceId: matrix.id,
      });

      return matrix;
    }),

  /**
   * Delete a matrix (hard delete)
   */
  delete: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Mark as deleted (soft delete with deletedAt)
      const matrix = await ctx.db.matrix.update({
        where: { id: input.matrixId },
        data: {
          deletedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'DELETE_MATRIX',
        resourceType: 'MATRIX',
        resourceId: matrix.id,
      });

      return matrix;
    }),

  /**
   * Validate matrix RACI rules
   */
  validate: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateMatrix(input.matrixId);
    }),

  /**
   * Get matrix validation summary
   */
  getValidationSummary: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getValidationSummary(input.matrixId);
    }),

  /**
   * Duplicate a matrix
   */
  duplicate: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        newName: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sourceMatrix = await ctx.db.matrix.findUnique({
        where: { id: input.matrixId },
        include: {
          tasks: {
            where: { deletedAt: null },
            include: {
              taskGroupMembers: true,
            },
          },
          taskGroups: true,
          assignments: {
            where: { deletedAt: null },
          },
        },
      });

      if (!sourceMatrix) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source matrix not found',
        });
      }

      // Create duplicate in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Create new matrix
        const newMatrix = await tx.matrix.create({
          data: {
            projectId: sourceMatrix.projectId,
            name: input.newName,
            description: sourceMatrix.description,
            templateId: sourceMatrix.templateId,
            version: 1,
          },
        });

        // Duplicate task groups
        const taskGroupMap = new Map<string, string>();
        for (const group of sourceMatrix.taskGroups) {
          const newGroup = await tx.taskGroup.create({
            data: {
              matrixId: newMatrix.id,
              name: group.name,
              color: group.color,
              description: group.description,
            },
          });
          taskGroupMap.set(group.id, newGroup.id);
        }

        // Duplicate tasks
        const taskMap = new Map<string, string>();
        for (const task of sourceMatrix.tasks) {
          const newTask = await tx.task.create({
            data: {
              matrixId: newMatrix.id,
              name: task.name,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              estimatedHours: task.estimatedHours,
              orderIndex: task.orderIndex,
            },
          });
          taskMap.set(task.id, newTask.id);

          // Duplicate task group memberships
          for (const membership of task.taskGroupMembers) {
            const newGroupId = taskGroupMap.get(membership.taskGroupId);
            if (newGroupId) {
              await tx.taskGroupMembership.create({
                data: {
                  taskId: newTask.id,
                  taskGroupId: newGroupId,
                },
              });
            }
          }
        }

        // Duplicate assignments
        for (const assignment of sourceMatrix.assignments) {
          const newTaskId = taskMap.get(assignment.taskId);
          if (newTaskId) {
            await tx.assignment.create({
              data: {
                matrixId: newMatrix.id,
                taskId: newTaskId,
                memberId: assignment.memberId,
                raciRole: assignment.raciRole,
                notes: assignment.notes,
                workload: assignment.workload,
                assignedBy: ctx.session.user.id,
              },
            });
          }
        }

        return newMatrix;
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'CREATE_MATRIX',
        resourceType: 'MATRIX',
        resourceId: result.id,
        changes: {
          created: {
            name: result.name,
            duplicatedFrom: sourceMatrix.id,
          },
        },
      });

      return result;
    }),
});
