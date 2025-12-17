/**
 * Multi-Tenant Utilities
 *
 * Provides helpers for verifying organization access, consultancy permissions,
 * and enforcing data isolation across tenants.
 */

import { db } from './db';

export type UserContext = {
  userId: string;
  email: string;
  isConsultancy: boolean;
  consultancyAccessLevel?: 'VIEW' | 'EDIT' | 'ADMIN';
};

/**
 * Verify user has access to an organization
 * Returns the member record if access is granted, throws error otherwise
 */
export async function verifyOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<{
  memberId: string;
  role: string;
  isConsultancyAccess: boolean;
}> {
  // First check if user is a consultancy user with cross-org access
  const consultancyAccess = await db.consultancyAccess.findUnique({
    where: { userId },
  });

  if (consultancyAccess?.canAccessAllOrgs) {
    // Consultancy users can access any organization
    // Check if they have a member record, if not they're viewing as consultancy
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
      memberId: '', // Empty for consultancy users without member record
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
    throw new Error(
      'ACCESS_DENIED: User does not have access to this organization'
    );
  }

  return {
    memberId: member.id,
    role: member.role,
    isConsultancyAccess: false,
  };
}

/**
 * Verify user has access to a project (via organization)
 */
export async function verifyProjectAccess(
  userId: string,
  projectId: string
): Promise<{ organizationId: string; memberId: string; role: string }> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  const access = await verifyOrganizationAccess(userId, project.organizationId);

  return {
    organizationId: project.organizationId,
    memberId: access.memberId,
    role: access.role,
  };
}

/**
 * Verify user has access to a matrix (via project and organization)
 */
export async function verifyMatrixAccess(
  userId: string,
  matrixId: string
): Promise<{
  organizationId: string;
  projectId: string;
  memberId: string;
  role: string;
}> {
  const matrix = await db.matrix.findUnique({
    where: { id: matrixId },
    select: {
      projectId: true,
      project: {
        select: { organizationId: true },
      },
    },
  });

  if (!matrix) {
    throw new Error('MATRIX_NOT_FOUND');
  }

  const access = await verifyOrganizationAccess(
    userId,
    matrix.project.organizationId
  );

  return {
    organizationId: matrix.project.organizationId,
    projectId: matrix.projectId,
    memberId: access.memberId,
    role: access.role,
  };
}

/**
 * Check if user has specific permission level
 */
export function hasPermission(
  userRole: string,
  requiredRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
): boolean {
  const roleHierarchy = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'];
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  if (userRoleIndex === -1) {
    return false;
  }

  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Get all organizations accessible by a user
 */
export async function getUserOrganizations(userId: string) {
  // Check consultancy access
  const consultancyAccess = await db.consultancyAccess.findUnique({
    where: { userId },
  });

  if (consultancyAccess?.canAccessAllOrgs) {
    // Return all organizations
    return await db.organization.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Return only organizations where user is a member
  const memberships = await db.member.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      organization: true,
    },
  });

  return memberships
    .filter((m) => m.organization.archivedAt === null)
    .map((m) => m.organization);
}
