/**
 * Audit Logging Utilities
 *
 * Provides centralized audit logging for all mutations in the system.
 * Tracks user actions, changes, and consultancy access.
 */

import { db } from './db';

export type AuditAction =
  | 'CREATE_ORGANIZATION'
  | 'UPDATE_ORGANIZATION'
  | 'ARCHIVE_ORGANIZATION'
  | 'CREATE_MEMBER'
  | 'UPDATE_MEMBER'
  | 'REMOVE_MEMBER'
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT'
  | 'ARCHIVE_PROJECT'
  | 'CREATE_MATRIX'
  | 'UPDATE_MATRIX'
  | 'ARCHIVE_MATRIX'
  | 'DELETE_MATRIX'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'REORDER_TASKS'
  | 'CREATE_ASSIGNMENT'
  | 'UPDATE_ASSIGNMENT'
  | 'DELETE_ASSIGNMENT'
  | 'BULK_ASSIGN'
  | 'CREATE_COMMENT'
  | 'UPDATE_COMMENT'
  | 'DELETE_COMMENT'
  | 'EXPORT_MATRIX'
  | 'IMPORT_TEMPLATE'
  | 'CREATE_TEMPLATE'
  | 'UPDATE_TEMPLATE'
  | 'DELETE_TEMPLATE';

export type ResourceType =
  | 'ORGANIZATION'
  | 'MEMBER'
  | 'PROJECT'
  | 'MATRIX'
  | 'TASK'
  | 'ASSIGNMENT'
  | 'COMMENT'
  | 'TEMPLATE';

export interface AuditLogData {
  organizationId: string;
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        changes: data.changes as any,
        ipAddress: data.ipAddress ?? undefined,
        userAgent: data.userAgent ?? undefined,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break application flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Create a consultancy audit log entry (for cross-org access)
 */
export async function createConsultancyAuditLog(data: {
  consultancyUserId: string;
  clientOrgId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.consultancyAuditLog.create({
      data: {
        consultancyUserId: data.consultancyUserId,
        clientOrgId: data.clientOrgId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        changes: data.changes as any,
        ipAddress: data.ipAddress ?? undefined,
      },
    });
  } catch (error) {
    console.error('Failed to create consultancy audit log:', error);
  }
}

/**
 * Helper to create diff object for audit log changes
 */
export function createChangeDiff<T extends Record<string, unknown>>(
  before: T,
  after: T
): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {};

  // Find changed fields
  for (const key in after) {
    if (before[key] !== after[key]) {
      diff[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }

  return diff;
}

/**
 * Get audit logs for an organization
 */
export async function getAuditLogs(
  organizationId: string,
  options?: {
    userId?: string;
    resourceType?: ResourceType;
    resourceId?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: {
    organizationId: string;
    userId?: string;
    resourceType?: ResourceType;
    resourceId?: string;
  } = {
    organizationId,
  };

  if (options?.userId) where.userId = options.userId;
  if (options?.resourceType) where.resourceType = options.resourceType;
  if (options?.resourceId) where.resourceId = options.resourceId;

  return await db.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });
}

/**
 * Get consultancy audit logs
 */
export async function getConsultancyAuditLogs(
  consultancyUserId: string,
  options?: {
    clientOrgId?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: {
    consultancyUserId: string;
    clientOrgId?: string;
  } = {
    consultancyUserId,
  };

  if (options?.clientOrgId) where.clientOrgId = options.clientOrgId;

  return await db.consultancyAuditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });
}
