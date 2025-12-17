/**
 * tRPC Configuration
 *
 * Defines the base tRPC instance, context, procedures, and middleware.
 * Provides type-safe API routes with authentication and authorization.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/server/auth';
import type { Session } from 'next-auth';

/**
 * Create context for each request
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * Initialize tRPC instance
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (unauthenticated) procedure
 * Available to all users, even when not logged in
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 * Requires valid user session
 *
 * DEV MODE: Auto-creates a test session if not authenticated
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Development bypass: ALWAYS auto-login with test user in dev mode
  if (process.env.NODE_ENV === 'development') {
    // Fetch the dev test user from the database
    const testUser = await ctx.db.user.findFirst({
      where: { email: 'sarah.chen@techcorp.com' },
    });

    if (testUser) {
      // Create a mock session for development (overrides any existing session)
      const mockSession = {
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      return next({
        ctx: {
          ...ctx,
          session: mockSession,
        },
      });
    }
  }

  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Organization-scoped procedure
 * Requires authentication and valid organization access
 */
export const organizationProcedure = protectedProcedure.use(
  async ({ ctx, next, getRawInput }) => {
    // Get raw input before zod validation
    const rawInput = await getRawInput();
    const inputData = rawInput as { organizationId?: string };

    if (!inputData?.organizationId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'organizationId is required',
      });
    }

    // Verify user has access to this organization
    const access = await verifyOrganizationAccess(
      ctx.session.user.id,
      inputData.organizationId
    );

    // Call next with enhanced context
    return next({
      ctx: {
        ...ctx,
        organizationId: inputData.organizationId,
        memberId: access.memberId,
        memberRole: access.role,
        isConsultancyAccess: access.isConsultancyAccess,
      },
    });
  }
);

/**
 * Project-scoped procedure
 * Requires authentication and valid project access
 */
export const projectProcedure = protectedProcedure.use(
  async ({ ctx, next, input }) => {
    const inputData = input as { projectId?: string };

    if (!inputData?.projectId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'projectId is required',
      });
    }

    // Verify user has access to this project (via organization)
    const project = await ctx.db.project.findUnique({
      where: { id: inputData.projectId },
      select: { organizationId: true },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    const access = await verifyOrganizationAccess(
      ctx.session.user.id,
      project.organizationId
    );

    return next({
      ctx: {
        ...ctx,
        projectId: inputData.projectId,
        organizationId: project.organizationId,
        memberId: access.memberId,
        memberRole: access.role,
        isConsultancyAccess: access.isConsultancyAccess,
      },
    });
  }
);

/**
 * Matrix-scoped procedure
 * Requires authentication and valid matrix access
 */
export const matrixProcedure = protectedProcedure.use(
  async ({ ctx, next, input }) => {
    const inputData = input as { matrixId?: string };

    if (!inputData?.matrixId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'matrixId is required',
      });
    }

    // Verify user has access to this matrix (via project and organization)
    const matrix = await ctx.db.matrix.findUnique({
      where: { id: inputData.matrixId },
      select: {
        projectId: true,
        project: {
          select: { organizationId: true },
        },
      },
    });

    if (!matrix) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Matrix not found',
      });
    }

    const access = await verifyOrganizationAccess(
      ctx.session.user.id,
      matrix.project.organizationId
    );

    return next({
      ctx: {
        ...ctx,
        matrixId: inputData.matrixId,
        projectId: matrix.projectId,
        organizationId: matrix.project.organizationId,
        memberId: access.memberId,
        memberRole: access.role,
        isConsultancyAccess: access.isConsultancyAccess,
      },
    });
  }
);

/**
 * Admin-only procedure
 * Requires authentication and ADMIN or OWNER role
 */
export const adminProcedure = organizationProcedure.use(({ ctx, next }) => {
  if (!['ADMIN', 'OWNER'].includes(ctx.memberRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be an admin to perform this action',
    });
  }

  return next({ ctx });
});

/**
 * Helper functions (imported from tenant utilities)
 */
async function verifyOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<{
  memberId: string;
  role: string;
  isConsultancyAccess: boolean;
}> {
  // Check consultancy access first
  const consultancyAccess = await db.consultancyAccess.findUnique({
    where: { userId },
  });

  if (consultancyAccess?.canAccessAllOrgs) {
    // Consultancy users can access any organization
    const member = await db.member.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (member) {
      return {
        memberId: member.id,
        role: member.role,
        isConsultancyAccess: true,
      };
    }

    // No member record, return consultancy-level access
    return {
      memberId: '',
      role: consultancyAccess.accessLevel,
      isConsultancyAccess: true,
    };
  }

  // Regular user - must have a member record
  const member = await db.member.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
      status: 'ACTIVE',
    },
  });

  if (!member) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this organization',
    });
  }

  return {
    memberId: member.id,
    role: member.role,
    isConsultancyAccess: false,
  };
}
