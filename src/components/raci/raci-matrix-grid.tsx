'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { RaciCell } from './raci-cell'
import type { RaciTask, RaciMember, TaskValidation, RaciRole } from '@/types/raci'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, AlertTriangle } from 'lucide-react'

interface RaciMatrixGridProps {
  tasks: RaciTask[]
  members: RaciMember[]
  onAssignmentChange: (
    taskId: string,
    memberId: string,
    role: RaciRole | null,
    assignmentId?: string
  ) => Promise<void>
  onAddTask?: () => void
  onAddMember?: () => void
  isReadOnly?: boolean
  showValidation?: boolean
}

export function RaciMatrixGrid({
  tasks,
  members,
  onAssignmentChange,
  onAddTask,
  onAddMember,
  isReadOnly = false,
  showValidation = true,
}: RaciMatrixGridProps) {
  const [loadingCell, setLoadingCell] = useState<string | null>(null)

  // Refs for virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Validate tasks
  const taskValidation = useMemo(() => {
    if (!showValidation) return {}

    const validation: Record<string, TaskValidation> = {}

    tasks.forEach((task) => {
      const accountableCount = task.assignments.filter((a) => a.raciRole === 'ACCOUNTABLE').length
      const hasResponsible = task.assignments.some((a) => a.raciRole === 'RESPONSIBLE')

      validation[task.id] = {
        hasAccountable: accountableCount === 1,
        hasResponsible,
        accountableCount,
      }
    })

    return validation
  }, [tasks, showValidation])

  const handleRoleChange = useCallback(
    async (taskId: string, memberId: string, role: RaciRole | null, assignmentId?: string) => {
      const cellKey = `${taskId}-${memberId}`
      setLoadingCell(cellKey)
      try {
        await onAssignmentChange(taskId, memberId, role, assignmentId)
      } finally {
        setLoadingCell(null)
      }
    },
    [onAssignmentChange]
  )

  // Virtual scrolling for tasks (rows)
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5, // Render 5 extra rows above/below viewport
  })

  // Column width constants
  const TASK_COLUMN_WIDTH = 250
  const MEMBER_COLUMN_WIDTH = 100

  // Calculate total grid width
  const gridWidth = TASK_COLUMN_WIDTH + members.length * MEMBER_COLUMN_WIDTH

  // Sync horizontal scroll between header and body
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  if (tasks.length === 0 || members.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center bg-white">
        <p className="text-muted-foreground mb-4">
          {tasks.length === 0
            ? 'No tasks yet. Add your first task to get started.'
            : 'No members yet. Add members to assign RACI roles.'}
        </p>
        {!isReadOnly && (
          <div className="flex gap-2 justify-center">
            {tasks.length === 0 && onAddTask && (
              <Button onClick={onAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            )}
            {members.length === 0 && onAddMember && (
              <Button onClick={onAddMember} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Fixed Header */}
      <div className="bg-gray-50 border-b overflow-hidden" ref={headerRef}>
        <div
          style={{ width: gridWidth }}
          className="flex"
        >
          {/* Task Column Header */}
          <div
            className="border-r flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ width: TASK_COLUMN_WIDTH }}
          >
            <span className="font-semibold">Tasks</span>
            {onAddTask && !isReadOnly && (
              <Button size="sm" variant="ghost" onClick={onAddTask} className="h-7 px-2">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Member Column Headers */}
          {members.map((member) => (
            <div
              key={member.id}
              className="border-r px-2 py-3 text-center flex-shrink-0"
              style={{ width: MEMBER_COLUMN_WIDTH }}
            >
              <div className="font-semibold text-sm truncate" title={member.name}>
                {member.name}
              </div>
              {member.department && (
                <div className="text-xs text-muted-foreground truncate" title={member.department.name}>
                  {member.department.code}
                </div>
              )}
            </div>
          ))}

          {/* Add Member Button */}
          {onAddMember && !isReadOnly && (
            <div className="flex-shrink-0" style={{ width: 60 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={onAddMember}
                className="w-full h-full"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }}
        onScroll={handleScroll}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: gridWidth,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index]
            if (!task) return null

            const validation = taskValidation[task.id]
            const hasError = validation
              ? !validation.hasAccountable || !validation.hasResponsible
              : false

            return (
              <div
                key={virtualRow.key}
                className="border-b absolute top-0 left-0 w-full flex"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Task Cell */}
                <div
                  className={cn(
                    'border-r px-4 py-3 flex items-center gap-2 flex-shrink-0',
                    hasError && 'bg-red-50'
                  )}
                  style={{ width: TASK_COLUMN_WIDTH }}
                >
                  {hasError && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" title={task.name}>
                      {task.name}
                    </div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground truncate" title={task.description}>
                        {task.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* RACI Cells for each member */}
                {members.map((member) => {
                  const assignment = task.assignments.find((a) => a.memberId === member.id)
                  const cellKey = `${task.id}-${member.id}`
                  const isLoading = loadingCell === cellKey

                  return (
                    <div
                      key={member.id}
                      className="border-r flex-shrink-0"
                      style={{ width: MEMBER_COLUMN_WIDTH }}
                    >
                      <RaciCell
                        taskId={task.id}
                        memberId={member.id}
                        currentRole={assignment?.raciRole ?? null}
                        onRoleChange={(role) =>
                          handleRoleChange(task.id, member.id, role, assignment?.id)
                        }
                        disabled={isReadOnly}
                        isLoading={isLoading}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border-t px-4 py-3">
        <div className="flex items-center gap-6 text-xs flex-wrap">
          <span className="font-semibold text-gray-700">Legend:</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-900 font-semibold border border-blue-300">
              R
            </span>
            <span className="text-gray-600">Responsible</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-green-100 text-green-900 font-semibold border border-green-300">
              A
            </span>
            <span className="text-gray-600">Accountable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-900 font-semibold border border-yellow-300">
              C
            </span>
            <span className="text-gray-600">Consulted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-purple-100 text-purple-900 font-semibold border border-purple-300">
              I
            </span>
            <span className="text-gray-600">Informed</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted-foreground">Click cells to cycle through roles</span>
          </div>
        </div>
      </div>
    </div>
  )
}
