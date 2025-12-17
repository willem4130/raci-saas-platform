// RACI Matrix Application - Type Definitions

// Define RACI role types
export type RaciRole = 'RESPONSIBLE' | 'ACCOUNTABLE' | 'CONSULTED' | 'INFORMED'

// Define task status types
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'ON_HOLD'

// Define task priority types
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// Define member role types
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

// Matrix grid types for UI
export interface MatrixGridData {
  tasks: TaskWithAssignments[]
  members: MemberWithDepartment[]
}

export interface TaskWithAssignments {
  id: string
  name: string
  description: string | null
  orderIndex: number
  status: TaskStatus
  priority: TaskPriority
  assignments: AssignmentData[]
  children?: TaskWithAssignments[]
  parentId: string | null
}

export interface AssignmentData {
  id: string
  taskId: string
  memberId: string
  raciRole: RaciRole
  notes: string | null
  workload: number | null
  assignedById: string
  assignedAt: Date
}

export interface MemberWithDepartment {
  id: string
  name: string
  email: string
  role: MemberRole
  department: {
    id: string
    name: string
    code: string
  } | null
}

// Component-specific types
export type RaciTask = TaskWithAssignments
export type RaciMember = MemberWithDepartment

export interface RaciCellData {
  taskId: string
  memberId: string
  role: RaciRole | null
  assignmentId: string | null
}

// Validation types
export interface TaskValidation {
  hasAccountable: boolean
  hasResponsible: boolean
  accountableCount: number
}

export interface ValidationError {
  taskId: string
  taskName: string
  type:
    | 'MISSING_ACCOUNTABLE'
    | 'MULTIPLE_ACCOUNTABLE'
    | 'MISSING_RESPONSIBLE'
    | 'NO_ASSIGNMENTS'
  message: string
  severity: 'error' | 'warning'
}
