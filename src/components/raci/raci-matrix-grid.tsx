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
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
      {/* Fixed Header */}
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200 overflow-hidden shadow-sm" ref={headerRef}>
        <div
          style={{ width: gridWidth }}
          className="flex"
        >
          {/* Task Column Header */}
          <div
            className="border-r border-gray-200 flex items-center justify-between px-5 py-4 flex-shrink-0 bg-white/50 backdrop-blur-sm"
            style={{ width: TASK_COLUMN_WIDTH }}
          >
            <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">Tasks</span>
            {onAddTask && !isReadOnly && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onAddTask}
                className="h-8 px-2 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Member Column Headers */}
          {members.map((member, index) => {
            // Generate initials for avatar
            const initials = member.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            // Generate a consistent color based on member name
            const colors = [
              'bg-blue-500',
              'bg-green-500',
              'bg-purple-500',
              'bg-amber-500',
              'bg-pink-500',
              'bg-indigo-500',
              'bg-cyan-500',
              'bg-rose-500',
            ]
            const colorClass = colors[index % colors.length]

            return (
              <div
                key={member.id}
                className="border-r border-gray-200 px-2 py-3 text-center flex-shrink-0 flex flex-col items-center gap-1.5 bg-white/30 hover:bg-blue-50/50 transition-colors group"
                style={{ width: MEMBER_COLUMN_WIDTH }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform group-hover:scale-110",
                  colorClass
                )}>
                  {initials}
                </div>
                <div className="font-semibold text-xs truncate w-full" title={member.name}>
                  {member.name.split(' ')[0]}
                </div>
                {member.department && (
                  <div className="text-[10px] text-muted-foreground truncate w-full" title={member.department.name}>
                    {member.department.code}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add Member Button */}
          {onAddMember && !isReadOnly && (
            <div className="flex-shrink-0 bg-white/30" style={{ width: 60 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={onAddMember}
                className="w-full h-full hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
        className="overflow-auto bg-gradient-to-br from-gray-50/30 to-white"
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
                className={cn(
                  "border-b border-gray-200 absolute top-0 left-0 w-full flex hover:bg-blue-50/30 transition-colors group",
                  hasError && "animate-pulse-border bg-red-50/50"
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Task Cell */}
                <div
                  className={cn(
                    'border-r border-gray-200 px-5 py-3 flex items-center gap-3 flex-shrink-0 bg-white/60 backdrop-blur-sm',
                    hasError && 'border-l-4 border-l-red-500'
                  )}
                  style={{ width: TASK_COLUMN_WIDTH }}
                >
                  {hasError && (
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 animate-pulse" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate group-hover:text-blue-900 transition-colors" title={task.name}>
                      {task.name}
                    </div>
                    {task.description && (
                      <div className="text-xs text-gray-600 truncate mt-0.5" title={task.description}>
                        {task.description}
                      </div>
                    )}
                    <div className="flex gap-2 mt-1">
                      {task.status && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          task.status === 'COMPLETED' && "bg-green-100 text-green-700",
                          task.status === 'IN_PROGRESS' && "bg-blue-100 text-blue-700",
                          task.status === 'NOT_STARTED' && "bg-gray-100 text-gray-700",
                          task.status === 'BLOCKED' && "bg-red-100 text-red-700",
                          task.status === 'ON_HOLD' && "bg-yellow-100 text-yellow-700"
                        )}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      )}
                      {task.priority && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          task.priority === 'HIGH' && "bg-orange-100 text-orange-700",
                          task.priority === 'MEDIUM' && "bg-yellow-100 text-yellow-700",
                          task.priority === 'LOW' && "bg-gray-100 text-gray-600"
                        )}>
                          {task.priority}
                        </span>
                      )}
                    </div>
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
                      className="border-r border-gray-200 flex-shrink-0"
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
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t border-gray-200 px-6 py-4 shadow-inner">
        <div className="flex items-center gap-8 text-xs flex-wrap">
          <span className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">Legend:</span>
          <div className="flex items-center gap-2.5 group cursor-help">
            <span className="px-3 py-1.5 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 font-bold border border-blue-300 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
              R
            </span>
            <div className="flex flex-col">
              <span className="text-gray-900 font-semibold">Responsible</span>
              <span className="text-gray-500 text-[10px]">Does the work</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 group cursor-help">
            <span className="px-3 py-1.5 rounded-md bg-gradient-to-br from-green-50 to-green-100 text-green-900 font-bold border border-green-300 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
              A
            </span>
            <div className="flex flex-col">
              <span className="text-gray-900 font-semibold">Accountable</span>
              <span className="text-gray-500 text-[10px]">Owns the outcome</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 group cursor-help">
            <span className="px-3 py-1.5 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 font-bold border border-amber-300 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
              C
            </span>
            <div className="flex flex-col">
              <span className="text-gray-900 font-semibold">Consulted</span>
              <span className="text-gray-500 text-[10px]">Provides input</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 group cursor-help">
            <span className="px-3 py-1.5 rounded-md bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900 font-bold border border-purple-300 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
              I
            </span>
            <div className="flex flex-col">
              <span className="text-gray-900 font-semibold">Informed</span>
              <span className="text-gray-500 text-[10px]">Kept updated</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-gray-700 font-medium">Click cells to cycle through roles</span>
          </div>
        </div>
      </div>
    </div>
  )
}
