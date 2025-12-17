/**
 * RACI Validation Rules
 *
 * Implements critical RACI matrix validation:
 * - Exactly 1 Accountable (A) per task (ERROR if violated)
 * - At least 1 Responsible (R) per task (WARNING if violated)
 * - No duplicate role assignments (same member + same role on same task)
 */

import { db } from '@/lib/db';

export type RaciRole = 'RESPONSIBLE' | 'ACCOUNTABLE' | 'CONSULTED' | 'INFORMED';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  taskId: string;
  taskName: string;
  message: string;
  code:
    | 'NO_ACCOUNTABLE'
    | 'MULTIPLE_ACCOUNTABLE'
    | 'DUPLICATE_ASSIGNMENT'
    | 'INVALID_ROLE';
}

export interface ValidationWarning {
  taskId: string;
  taskName: string;
  message: string;
  code: 'NO_RESPONSIBLE' | 'NO_CONSULTED' | 'NO_INFORMED' | 'EXCESSIVE_LOAD';
}

/**
 * Validate all tasks in a matrix
 * Returns comprehensive validation results with errors and warnings
 */
export async function validateMatrix(
  matrixId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Get all tasks and assignments for this matrix
  const tasks = await db.task.findMany({
    where: {
      matrixId,
      deletedAt: null,
    },
    include: {
      assignments: {
        where: {
          deletedAt: null,
        },
        include: {
          member: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  // Validate each task
  for (const task of tasks) {
    const taskValidation = validateTaskAssignments(task);
    errors.push(...taskValidation.errors);
    warnings.push(...taskValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate assignments for a single task
 */
export function validateTaskAssignments(task: {
  id: string;
  name: string;
  assignments: Array<{
    raciRole: string;
    memberId: string;
  }>;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Count assignments by role
  const accountableCount = task.assignments.filter(
    (a) => a.raciRole === 'ACCOUNTABLE'
  ).length;
  const responsibleCount = task.assignments.filter(
    (a) => a.raciRole === 'RESPONSIBLE'
  ).length;

  // CRITICAL: Exactly 1 Accountable
  if (accountableCount === 0) {
    errors.push({
      taskId: task.id,
      taskName: task.name,
      message: 'Task must have exactly one Accountable (A) person',
      code: 'NO_ACCOUNTABLE',
    });
  } else if (accountableCount > 1) {
    errors.push({
      taskId: task.id,
      taskName: task.name,
      message: `Task has ${accountableCount} Accountable assignments (must be exactly 1)`,
      code: 'MULTIPLE_ACCOUNTABLE',
    });
  }

  // WARNING: At least 1 Responsible
  if (responsibleCount === 0) {
    warnings.push({
      taskId: task.id,
      taskName: task.name,
      message: 'Task should have at least one Responsible (R) person',
      code: 'NO_RESPONSIBLE',
    });
  }

  // Check for duplicate assignments (same member + same role)
  const assignmentKeys = new Set<string>();
  for (const assignment of task.assignments) {
    const key = `${assignment.memberId}-${assignment.raciRole}`;
    if (assignmentKeys.has(key)) {
      errors.push({
        taskId: task.id,
        taskName: task.name,
        message: 'Duplicate role assignment detected for same member',
        code: 'DUPLICATE_ASSIGNMENT',
      });
    }
    assignmentKeys.add(key);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a specific assignment before creation/update
 * Checks if adding this assignment would violate RACI rules
 */
export async function validateAssignment(
  taskId: string,
  memberId: string,
  raciRole: RaciRole,
  options?: {
    excludeAssignmentId?: string; // For updates, exclude current assignment
  }
): Promise<{ isValid: boolean; error?: string }> {
  // Validate role is valid
  const validRoles: RaciRole[] = [
    'RESPONSIBLE',
    'ACCOUNTABLE',
    'CONSULTED',
    'INFORMED',
  ];
  if (!validRoles.includes(raciRole)) {
    return {
      isValid: false,
      error: `Invalid RACI role: ${raciRole}`,
    };
  }

  // Get existing assignments for this task
  const existingAssignments = await db.assignment.findMany({
    where: {
      taskId,
      deletedAt: null,
      ...(options?.excludeAssignmentId && {
        id: { not: options.excludeAssignmentId },
      }),
    },
  });

  // Check for duplicate assignment (same member + same role)
  const duplicate = existingAssignments.find(
    (a) => a.memberId === memberId && a.raciRole === raciRole
  );

  if (duplicate) {
    return {
      isValid: false,
      error: 'This member already has this role assigned to this task',
    };
  }

  // If assigning Accountable, check there isn't already one
  if (raciRole === 'ACCOUNTABLE') {
    const existingAccountable = existingAssignments.find(
      (a) => a.raciRole === 'ACCOUNTABLE'
    );

    if (existingAccountable) {
      return {
        isValid: false,
        error:
          'Task already has an Accountable person. Please remove the existing assignment first.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Get validation summary for a matrix
 * Returns counts of errors and warnings by type
 */
export async function getValidationSummary(matrixId: string) {
  const validation = await validateMatrix(matrixId);

  return {
    totalTasks: await db.task.count({
      where: { matrixId, deletedAt: null },
    }),
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
    errors: validation.errors,
    warnings: validation.warnings,
    isValid: validation.isValid,
    errorsByType: {
      noAccountable: validation.errors.filter((e) => e.code === 'NO_ACCOUNTABLE')
        .length,
      multipleAccountable: validation.errors.filter(
        (e) => e.code === 'MULTIPLE_ACCOUNTABLE'
      ).length,
      duplicateAssignment: validation.errors.filter(
        (e) => e.code === 'DUPLICATE_ASSIGNMENT'
      ).length,
    },
    warningsByType: {
      noResponsible: validation.warnings.filter((w) => w.code === 'NO_RESPONSIBLE')
        .length,
    },
  };
}

/**
 * Get tasks with validation issues in a matrix
 * Returns tasks that have errors or warnings
 */
export async function getTasksWithIssues(matrixId: string) {
  const validation = await validateMatrix(matrixId);

  const taskIdsWithErrors = new Set(validation.errors.map((e) => e.taskId));
  const taskIdsWithWarnings = new Set(
    validation.warnings.map((w) => w.taskId)
  );

  return {
    tasksWithErrors: Array.from(taskIdsWithErrors),
    tasksWithWarnings: Array.from(taskIdsWithWarnings),
    details: {
      errors: validation.errors,
      warnings: validation.warnings,
    },
  };
}
