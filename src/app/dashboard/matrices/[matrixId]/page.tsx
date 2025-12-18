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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="hover:bg-blue-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                {matrix.name}
              </h1>
              <Badge
                variant="secondary"
                className={matrix.archivedAt
                  ? "bg-gray-100 text-gray-700 border border-gray-300"
                  : "bg-green-100 text-green-700 border border-green-300 shadow-sm"
                }
              >
                {matrix.archivedAt ? 'Archived' : 'Active'}
              </Badge>
            </div>
            {matrix.description && (
              <p className="text-gray-700 pl-12 text-base">{matrix.description}</p>
            )}
            <div className="pl-12 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Project:</span>
              <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">
                {matrix.project.name}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-blue-900 uppercase tracking-wide">Total Tasks</CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
              <ListTodo className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
              {raciTasks.length}
            </div>
            <p className="text-sm text-blue-700 font-medium mt-1">
              {raciTasks.filter((t) => t.status === 'IN_PROGRESS').length} in progress
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-green-900 uppercase tracking-wide">Team Members</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-md">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-green-900 to-green-600 bg-clip-text text-transparent">
              {raciMembers.length}
            </div>
            <p className="text-sm text-green-700 font-medium mt-1">Active collaborators</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-purple-900 uppercase tracking-wide">Assignments</CardTitle>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
              <Badge variant="outline" className="h-6 w-6 flex items-center justify-center bg-white text-purple-900 font-bold border-0 text-xs">
                RACI
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-900 to-pink-600 bg-clip-text text-transparent">
              {raciTasks.reduce((acc, task) => acc + task.assignments.length, 0)}
            </div>
            <p className="text-sm text-purple-700 font-medium mt-1">Role assignments</p>
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
