'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Download, Users, ListTodo, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RaciMatrixGrid } from '@/components/raci/raci-matrix-grid'
import { api } from '@/lib/trpc/client'
import type { RaciTask, RaciMember, RaciRole } from '@/types/raci'
import { toast } from 'sonner'

export default function MatrixDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matrixId = params.matrixId as string

  // Fetch matrix data
  const { data: matrix, isLoading: matrixLoading } = api.matrix.getById.useQuery(
    { matrixId },
    { enabled: !!matrixId }
  )

  // Fetch tasks with assignments
  const { data: tasks, isLoading: tasksLoading } = api.task.list.useQuery(
    { matrixId },
    { enabled: !!matrixId }
  )

  // Fetch members for the organization
  const { data: members, isLoading: membersLoading } = api.member.list.useQuery(
    { organizationId: matrix?.project.organizationId ?? '' },
    { enabled: !!matrix?.project.organizationId }
  )

  // Mutations
  const createAssignment = api.assignment.create.useMutation()
  const updateAssignment = api.assignment.update.useMutation()
  const deleteAssignment = api.assignment.delete.useMutation()

  // Utils
  const utils = api.useUtils()

  const isLoading = matrixLoading || tasksLoading || membersLoading

  const handleAssignmentChange = async (
    taskId: string,
    memberId: string,
    role: RaciRole | null,
    assignmentId?: string
  ) => {
    try {
      if (role === null) {
        // Delete assignment
        if (assignmentId) {
          await deleteAssignment.mutateAsync({
            matrixId,
            assignmentId,
          })
          toast.success('Assignment removed')
        }
      } else if (assignmentId) {
        // Update existing assignment
        await updateAssignment.mutateAsync({
          matrixId,
          assignmentId,
          raciRole: role,
        })
        toast.success('Assignment updated')
      } else {
        // Create new assignment
        await createAssignment.mutateAsync({
          matrixId,
          taskId,
          memberId,
          raciRole: role,
        })
        toast.success('Assignment created')
      }

      // Invalidate and refetch tasks to update the grid
      await utils.task.list.invalidate({ matrixId })
    } catch (error) {
      console.error('Failed to update assignment:', error)
      toast.error('Failed to update assignment')
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!matrix) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Matrix not found</h2>
        <p className="text-muted-foreground mb-4">
          The matrix you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // Transform data to match component types
  const raciTasks: RaciTask[] =
    tasks?.map((task: any): RaciTask => ({
      id: task.id,
      name: task.name,
      description: task.description,
      orderIndex: task.orderIndex,
      status: task.status as RaciTask['status'],
      priority: task.priority as RaciTask['priority'],
      parentId: task.parentTaskId,
      assignments: task.assignments.map((a: any) => ({
        id: a.id,
        taskId: a.taskId,
        memberId: a.memberId,
        raciRole: a.raciRole as RaciRole,
        notes: a.notes,
        workload: a.workload,
        assignedById: a.assignedBy,
        assignedAt: a.assignedAt,
      })),
    })) ?? []

  const raciMembers: RaciMember[] =
    members?.map((member): RaciMember => ({
      id: member.id,
      name: member.user.name || member.user.email,
      email: member.user.email,
      role: member.role as RaciMember['role'],
      department: null, // TODO: Fetch departments separately if needed
    })) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{matrix.name}</h1>
            <Badge variant="secondary">{matrix.archivedAt ? 'Archived' : 'Active'}</Badge>
          </div>
          {matrix.description && (
            <p className="text-muted-foreground pl-12">{matrix.description}</p>
          )}
          <div className="pl-12 text-sm text-muted-foreground">
            {matrix.project.name}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{raciTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {raciTasks.filter((t) => t.status === 'IN_PROGRESS').length} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{raciMembers.length}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <Badge variant="outline" className="h-4">
              RACI
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {raciTasks.reduce((acc, task) => acc + task.assignments.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total role assignments</p>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Grid */}
      <RaciMatrixGrid
        tasks={raciTasks}
        members={raciMembers}
        onAssignmentChange={handleAssignmentChange}
        showValidation={true}
      />
    </div>
  )
}
