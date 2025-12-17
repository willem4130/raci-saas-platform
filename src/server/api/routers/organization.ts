/**
 * Organization Router
 *
 * Handles organization CRUD operations, consultancy access management,
 * and organization switching for multi-tenant functionality.
 */

import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
  organizationProcedure,
  adminProcedure,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { createAuditLog } from '@/lib/audit';
import { getUserOrganizations } from '@/lib/tenant';

export const organizationRouter = createTRPCRouter({
  /**
   * List all organizations accessible by the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Check consultancy access
    const consultancyAccess = await ctx.db.consultancyAccess.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (consultancyAccess?.canAccessAllOrgs) {
      // Return all organizations
      return await ctx.db.organization.findMany({
        where: {
          archivedAt: null,
        },
        orderBy: { name: 'asc' },
      });
    }

    // Return only organizations where user is a member
    const memberships = await ctx.db.member.findMany({
      where: {
        userId: ctx.session.user.id,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
      },
    });

    return memberships
      .filter((m) => m.organization.archivedAt === null)
      .map((m) => m.organization);
  }),

  /**
   * Get a specific organization by ID
   */
  getById: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const organization = await ctx.db.organization.findUnique({
        where: { id: input.organizationId },
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
              templates: true,
            },
          },
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      return organization;
    }),

  /**
   * Create a new organization
   * Automatically makes the creator an OWNER member
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z
          .string()
          .min(2)
          .max(50)
          .regex(/^[a-z0-9-]+$/),
        type: z.enum(['CLIENT', 'CONSULTANCY']).default('CLIENT'),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken
      const existing = await ctx.db.organization.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An organization with this slug already exists',
        });
      }

      // Create organization and member record in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: input.name,
            slug: input.slug,
            type: input.type,
            settings: input.settings as any,
          },
        });

        // Create OWNER member record for the creator
        const member = await tx.member.create({
          data: {
            userId: ctx.session.user.id,
            organizationId: organization.id,
            role: 'OWNER',
            jobTitle: 'Owner',
            departmentLabels: [],
            status: 'ACTIVE',
          },
        });

        // Create audit log
        await createAuditLog({
          organizationId: organization.id,
          userId: ctx.session.user.id,
          action: 'CREATE_ORGANIZATION',
          resourceType: 'ORGANIZATION',
          resourceId: organization.id,
          changes: {
            created: {
              name: organization.name,
              slug: organization.slug,
              type: organization.type,
            },
          },
        });

        return { organization, member };
      });

      return result.organization;
    }),

  /**
   * Update an organization
   * Requires ADMIN or OWNER role
   */
  update: adminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(100).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.organization.findUnique({
        where: { id: input.organizationId },
      });

      if (!before) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      const organization = await ctx.db.organization.update({
        where: { id: input.organizationId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.settings && { settings: input.settings as any }),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.session.user.id,
        action: 'UPDATE_ORGANIZATION',
        resourceType: 'ORGANIZATION',
        resourceId: organization.id,
        changes: {
          before: { name: before.name, settings: before.settings },
          after: { name: organization.name, settings: organization.settings },
        },
      });

      return organization;
    }),

  /**
   * Archive an organization (soft delete)
   * Requires OWNER role
   */
  archive: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is OWNER
      if (ctx.memberRole !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organization owners can archive organizations',
        });
      }

      const organization = await ctx.db.organization.update({
        where: { id: input.organizationId },
        data: {
          archivedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.session.user.id,
        action: 'ARCHIVE_ORGANIZATION',
        resourceType: 'ORGANIZATION',
        resourceId: organization.id,
      });

      return organization;
    }),

  /**
   * Get organization members
   */
  getMembers: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'INVITED']).optional(),
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
        },
        orderBy: { createdAt: 'asc' },
      });
    }),

  /**
   * Get organization statistics
   */
  getStats: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [memberCount, projectCount, matrixCount, activeTaskCount] =
        await Promise.all([
          ctx.db.member.count({
            where: {
              organizationId: input.organizationId,
              status: 'ACTIVE',
            },
          }),
          ctx.db.project.count({
            where: {
              organizationId: input.organizationId,
              archivedAt: null,
            },
          }),
          ctx.db.matrix.count({
            where: {
              project: {
                organizationId: input.organizationId,
              },
              archivedAt: null,
              deletedAt: null,
            },
          }),
          ctx.db.task.count({
            where: {
              matrix: {
                project: {
                  organizationId: input.organizationId,
                },
              },
              status: { not: 'COMPLETED' },
              deletedAt: null,
            },
          }),
        ]);

      return {
        memberCount,
        projectCount,
        matrixCount,
        activeTaskCount,
      };
    }),

  /**
   * Check if current user is a consultancy user
   */
  isConsultancyUser: protectedProcedure.query(async ({ ctx }) => {
    const consultancyAccess = await ctx.db.consultancyAccess.findUnique({
      where: { userId: ctx.session.user.id },
    });

    return {
      isConsultancy: !!consultancyAccess?.canAccessAllOrgs,
      accessLevel: consultancyAccess?.accessLevel,
    };
  }),
});
