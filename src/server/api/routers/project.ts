/**
 * Project Router
 *
 * Handles project CRUD operations within organizations.
 * Projects contain matrices and serve as organizational units.
 */

import { z } from 'zod';
import {
  createTRPCRouter,
  organizationProcedure,
  projectProcedure,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { createAuditLog } from '@/lib/audit';

export const projectRouter = createTRPCRouter({
  /**
   * List all projects in an organization
   */
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        includeArchived: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.project.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.includeArchived ? {} : { archivedAt: null }),
        },
        include: {
          _count: {
            select: {
              matrices: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  /**
   * Get a specific project by ID
   */
  getById: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          matrices: {
            where: {
              archivedAt: null,
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
              description: true,
              version: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  tasks: true,
                  assignments: true,
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
          },
          _count: {
            select: {
              matrices: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return project;
    }),

  /**
   * Create a new project
   */
  create: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use memberId from context (verified by organizationProcedure)
      const ownerId = ctx.memberId;

      if (!ownerId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Must be a member of the organization to create projects',
        });
      }

      const project = await ctx.db.project.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description ?? null,
          ownerId: ownerId,
        },
        include: {
          _count: {
            select: {
              matrices: true,
            },
          },
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.session.user.id,
        action: 'CREATE_PROJECT',
        resourceType: 'PROJECT',
        resourceId: project.id,
        changes: {
          created: {
            name: project.name,
            description: project.description,
          },
        },
      });

      return project;
    }),

  /**
   * Update a project
   */
  update: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        ownerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.project.findUnique({
        where: { id: input.projectId },
      });

      if (!before) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Verify new owner exists if changing owner
      if (input.ownerId) {
        const newOwner = await ctx.db.member.findUnique({
          where: {
            id: input.ownerId,
            organizationId: ctx.organizationId,
          },
        });

        if (!newOwner) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'New owner must be a member of the organization',
          });
        }
      }

      const project = await ctx.db.project.update({
        where: { id: input.projectId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.ownerId && { ownerId: input.ownerId }),
          updatedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'UPDATE_PROJECT',
        resourceType: 'PROJECT',
        resourceId: project.id,
        changes: {
          before: {
            name: before.name,
            description: before.description,
            ownerId: before.ownerId,
          },
          after: {
            name: project.name,
            description: project.description,
            ownerId: project.ownerId,
          },
        },
      });

      return project;
    }),

  /**
   * Archive a project (soft delete)
   */
  archive: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.update({
        where: { id: input.projectId },
        data: {
          archivedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        action: 'ARCHIVE_PROJECT',
        resourceType: 'PROJECT',
        resourceId: project.id,
      });

      return project;
    }),

  /**
   * Restore an archived project
   */
  restore: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.update({
        where: { id: input.projectId },
        data: {
          archivedAt: null,
        },
      });

      return project;
    }),

  /**
   * Get project statistics
   */
  getStats: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [matrixCount, taskCount, assignmentCount] = await Promise.all([
        ctx.db.matrix.count({
          where: {
            projectId: input.projectId,
            archivedAt: null,
            deletedAt: null,
          },
        }),
        ctx.db.task.count({
          where: {
            matrix: {
              projectId: input.projectId,
            },
            deletedAt: null,
          },
        }),
        ctx.db.assignment.count({
          where: {
            matrix: {
              projectId: input.projectId,
            },
            deletedAt: null,
          },
        }),
      ]);

      return {
        matrixCount,
        taskCount,
        assignmentCount,
      };
    }),
});
