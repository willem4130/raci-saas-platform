/**
 * Task Router
 *
 * Handles task CRUD operations with support for:
 * - Parent-child hierarchy (subtasks)
 * - Task groups (cross-cutting categorization)
 * - Task ordering and reordering
 */

import { z } from 'zod';
import {
  createTRPCRouter,
  matrixProcedure,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { createAuditLog } from '@/lib/audit';

export const taskRouter = createTRPCRouter({
  /**
   * List all tasks in a matrix
   */
  list: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        includeDeleted: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.task.findMany({
        where: {
          matrixId: input.matrixId,
          ...(input.includeDeleted ? {} : { deletedAt: null }),
        },
        include: {
          parentTask: {
            select: {
              id: true,
              name: true,
            },
          },
          children: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          taskGroupMembers: {
            include: {
              taskGroup: true,
            },
          },
          assignments: {
            where: { deletedAt: null },
            include: {
              member: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              assignments: true,
              comments: true,
            },
          },
        },
        orderBy: [{ orderIndex: 'asc' }],
      });
    }),

  /**
   * Get a specific task by ID
   */
  getById: matrixProcedure
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
          parentTask: {
            select: {
              id: true,
              name: true,
            },
          },
          children: {
            where: { deletedAt: null },
          },
          taskGroupMembers: {
            include: {
              taskGroup: true,
            },
          },
          assignments: {
            where: { deletedAt: null },
            include: {
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
          },
          comments: {
            where: { deletedAt: null },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      return task;
    }),

  /**
   * Create a new task
   */
  create: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        name: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        parentTaskId: z.string().optional(),
        status: z
          .enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'])
          .default('NOT_STARTED'),
        priority: z
          .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
          .default('MEDIUM'),
        dueDate: z.date().optional(),
        estimatedHours: z.number().min(0).max(10000).optional(),
        orderIndex: z.number().int().min(0).optional(),
        taskGroupIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify parent task exists if specified
      if (input.parentTaskId) {
        const parentTask = await ctx.db.task.findUnique({
          where: {
            id: input.parentTaskId,
            matrixId: input.matrixId,
            deletedAt: null,
          },
        });

        if (!parentTask) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Parent task not found or deleted',
          });
        }
      }

      // Calculate orderIndex if not provided
      let orderIndex = input.orderIndex;
      if (orderIndex === undefined) {
        const maxOrder = await ctx.db.task.aggregate({
          where: {
            matrixId: input.matrixId,
            deletedAt: null,
          },
          _max: {
            orderIndex: true,
          },
        });
        orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
      }

      // Create task in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            matrixId: input.matrixId,
            name: input.name,
            description: input.description ?? null,
            parentTaskId: input.parentTaskId ?? null,
            status: input.status,
            priority: input.priority,
            dueDate: input.dueDate ?? null,
            estimatedHours: input.estimatedHours ?? null,
            orderIndex,
          },
        });

        // Add to task groups if specified
        if (input.taskGroupIds.length > 0) {
          await tx.taskGroupMembership.createMany({
            data: input.taskGroupIds.map((groupId) => ({
              taskId: task.id,
              taskGroupId: groupId,
            })),
          });
        }

        return task;
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'CREATE_TASK',
        resourceType: 'TASK',
        resourceId: result.id,
        changes: {
          created: {
            name: result.name,
            matrixId: result.matrixId,
            parentTaskId: result.parentTaskId,
          },
        },
      });

      return result;
    }),

  /**
   * Update a task
   */
  update: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        taskId: z.string(),
        name: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        parentTaskId: z.string().nullable().optional(),
        status: z
          .enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'])
          .optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        dueDate: z.date().nullable().optional(),
        estimatedHours: z.number().min(0).max(10000).nullable().optional(),
        taskGroupIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.task.findUnique({
        where: {
          id: input.taskId,
          matrixId: input.matrixId,
        },
      });

      if (!before) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Verify parent task exists if changing parent
      if (input.parentTaskId !== undefined && input.parentTaskId !== null) {
        // Prevent circular references
        if (input.parentTaskId === input.taskId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Task cannot be its own parent',
          });
        }

        const parentTask = await ctx.db.task.findUnique({
          where: {
            id: input.parentTaskId,
            matrixId: input.matrixId,
            deletedAt: null,
          },
        });

        if (!parentTask) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Parent task not found or deleted',
          });
        }
      }

      // Update task in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        const task = await tx.task.update({
          where: { id: input.taskId },
          data: {
            ...(input.name && { name: input.name }),
            ...(input.description !== undefined && {
              description: input.description,
            }),
            ...(input.parentTaskId !== undefined && {
              parentTaskId: input.parentTaskId,
            }),
            ...(input.status && { status: input.status }),
            ...(input.priority && { priority: input.priority }),
            ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
            ...(input.estimatedHours !== undefined && {
              estimatedHours: input.estimatedHours,
            }),
            ...(input.status === 'COMPLETED' && {
              completedAt: new Date(),
            }),
            updatedAt: new Date(),
          },
        });

        // Update task groups if specified
        if (input.taskGroupIds !== undefined) {
          // Remove existing memberships
          await tx.taskGroupMembership.deleteMany({
            where: { taskId: input.taskId },
          });

          // Add new memberships
          if (input.taskGroupIds.length > 0) {
            await tx.taskGroupMembership.createMany({
              data: input.taskGroupIds.map((groupId) => ({
                taskId: task.id,
                taskGroupId: groupId,
              })),
            });
          }
        }

        return task;
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'UPDATE_TASK',
        resourceType: 'TASK',
        resourceId: result.id,
        changes: {
          before: {
            name: before.name,
            status: before.status,
            priority: before.priority,
          },
          after: {
            name: result.name,
            status: result.status,
            priority: result.priority,
          },
        },
      });

      return result;
    }),

  /**
   * Delete a task (soft delete)
   */
  delete: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        taskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.update({
        where: {
          id: input.taskId,
          matrixId: input.matrixId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'DELETE_TASK',
        resourceType: 'TASK',
        resourceId: task.id,
        changes: {
          deleted: {
            name: task.name,
          },
        },
      });

      return task;
    }),

  /**
   * Reorder tasks (drag-drop)
   */
  reorder: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        taskIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update orderIndex for each task
      await ctx.db.$transaction(
        input.taskIds.map((taskId, index) =>
          ctx.db.task.update({
            where: {
              id: taskId,
              matrixId: input.matrixId,
            },
            data: {
              orderIndex: index,
              updatedAt: new Date(),
            },
          })
        )
      );

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'REORDER_TASKS',
        resourceType: 'TASK',
        resourceId: input.matrixId,
        changes: {
          taskOrder: input.taskIds,
        },
      });

      return { success: true };
    }),

  /**
   * Bulk create tasks
   */
  bulkCreate: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
        tasks: z.array(
          z.object({
            name: z.string().min(1).max(500),
            description: z.string().max(5000).optional(),
            parentTaskId: z.string().optional(),
            status: z
              .enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'])
              .default('NOT_STARTED'),
            priority: z
              .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
              .default('MEDIUM'),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get starting orderIndex
      const maxOrder = await ctx.db.task.aggregate({
        where: {
          matrixId: input.matrixId,
          deletedAt: null,
        },
        _max: {
          orderIndex: true,
        },
      });

      let orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

      // Create tasks in transaction
      const tasks = await ctx.db.$transaction(
        input.tasks.map((taskData) =>
          ctx.db.task.create({
            data: {
              matrixId: input.matrixId,
              name: taskData.name,
              description: taskData.description ?? null,
              parentTaskId: taskData.parentTaskId ?? null,
              status: taskData.status,
              priority: taskData.priority,
              orderIndex: orderIndex++,
            },
          })
        )
      );

      return tasks;
    }),

  /**
   * Get task hierarchy (tree structure)
   */
  getHierarchy: matrixProcedure
    .input(
      z.object({
        matrixId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.db.task.findMany({
        where: {
          matrixId: input.matrixId,
          deletedAt: null,
        },
        include: {
          children: {
            where: { deletedAt: null },
            include: {
              children: {
                where: { deletedAt: null },
              },
            },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: [{ orderIndex: 'asc' }],
      });

      // Return only root tasks (no parent)
      return tasks.filter((t) => !t.parentTaskId);
    }),
});
