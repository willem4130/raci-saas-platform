/**
 * Member Router
 *
 * Handles organization member management including invitations,
 * role updates, and member profile management.
 */

import { z } from 'zod';
import {
  createTRPCRouter,
  organizationProcedure,
  adminProcedure,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { createAuditLog } from '@/lib/audit';

export const memberRouter = createTRPCRouter({
  /**
   * List members in an organization
   */
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'INVITED']).optional(),
        departmentLabel: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.member.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.status && { status: input.status }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              comments: true,
            },
          },
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    }),

  /**
   * Get a specific member by ID
   */
  getById: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.member.findUnique({
        where: {
          id: input.memberId,
          organizationId: input.organizationId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignments: {
            where: {
              deletedAt: null,
            },
            include: {
              task: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      return member;
    }),

  /**
   * Add a new member to the organization
   * Requires ADMIN or OWNER role
   */
  create: adminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
        role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
        jobTitle: z.string().min(1).max(100),
        departmentLabels: z.array(z.string()).default([]),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists in this organization
      const existing = await ctx.db.member.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a member of this organization',
        });
      }

      // Create member
      const member = await ctx.db.member.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          role: input.role,
          jobTitle: input.jobTitle,
          departmentLabels: input.departmentLabels,
          avatarUrl: input.avatarUrl ?? null,
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
      });

      // Audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.session.user.id,
        action: 'CREATE_MEMBER',
        resourceType: 'MEMBER',
        resourceId: member.id,
        changes: {
          created: {
            userId: input.userId,
            role: input.role,
            jobTitle: input.jobTitle,
          },
        },
      });

      return member;
    }),

  /**
   * Update a member's profile or role
   * Requires ADMIN or OWNER role
   */
  update: adminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
        role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
        jobTitle: z.string().min(1).max(100).optional(),
        departmentLabels: z.array(z.string()).optional(),
        avatarUrl: z.string().url().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.member.findUnique({
        where: {
          id: input.memberId,
          organizationId: input.organizationId,
        },
      });

      if (!before) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Prevent removing the last owner
      if (input.role && input.role !== 'OWNER' && before.role === 'OWNER') {
        const ownerCount = await ctx.db.member.count({
          where: {
            organizationId: input.organizationId,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        });

        if (ownerCount === 1) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Cannot change role of the last owner. Please assign another owner first.',
          });
        }
      }

      const member = await ctx.db.member.update({
        where: {
          id: input.memberId,
        },
        data: {
          ...(input.role && { role: input.role }),
          ...(input.jobTitle && { jobTitle: input.jobTitle }),
          ...(input.departmentLabels && {
            departmentLabels: input.departmentLabels,
          }),
          ...(input.avatarUrl && { avatarUrl: input.avatarUrl }),
          ...(input.status && { status: input.status }),
          updatedAt: new Date(),
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
      });

      // Audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.session.user.id,
        action: 'UPDATE_MEMBER',
        resourceType: 'MEMBER',
        resourceId: member.id,
        changes: {
          before: {
            role: before.role,
            jobTitle: before.jobTitle,
            status: before.status,
          },
          after: {
            role: member.role,
            jobTitle: member.jobTitle,
            status: member.status,
          },
        },
      });

      return member;
    }),

  /**
   * Remove a member from the organization
   * Deletes member record and cascades to assignments
   */
  remove: adminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findUnique({
        where: {
          id: input.memberId,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Prevent removing the last owner
      if (member.role === 'OWNER') {
        const ownerCount = await ctx.db.member.count({
          where: {
            organizationId: input.organizationId,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        });

        if (ownerCount === 1) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Cannot remove the last owner. Please assign another owner first.',
          });
        }
      }

      // Delete member (cascades to assignments via Prisma schema)
      await ctx.db.member.delete({
        where: {
          id: input.memberId,
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.session.user.id,
        action: 'REMOVE_MEMBER',
        resourceType: 'MEMBER',
        resourceId: member.id,
        changes: {
          removed: {
            userId: member.userId,
            role: member.role,
            jobTitle: member.jobTitle,
          },
        },
      });

      return { success: true };
    }),

  /**
   * Get member workload statistics
   */
  getWorkload: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.assignment.findMany({
        where: {
          memberId: input.memberId,
          deletedAt: null,
          task: {
            deletedAt: null,
            status: { not: 'COMPLETED' },
          },
        },
        include: {
          task: {
            select: {
              status: true,
              priority: true,
              dueDate: true,
            },
          },
        },
      });

      // Count assignments by RACI role
      const byRole = {
        RESPONSIBLE: assignments.filter((a) => a.raciRole === 'RESPONSIBLE')
          .length,
        ACCOUNTABLE: assignments.filter((a) => a.raciRole === 'ACCOUNTABLE')
          .length,
        CONSULTED: assignments.filter((a) => a.raciRole === 'CONSULTED')
          .length,
        INFORMED: assignments.filter((a) => a.raciRole === 'INFORMED').length,
      };

      // Calculate workload percentage (if set)
      const totalWorkload = assignments.reduce(
        (sum, a) => sum + (a.workload ?? 0),
        0
      );

      return {
        totalAssignments: assignments.length,
        byRole,
        totalWorkload,
        assignments,
      };
    }),
});
