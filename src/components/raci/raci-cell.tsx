'use client'

import { useState } from 'react'
import type { RaciRole } from '@/types/raci'
import { cn } from '@/lib/utils'

interface RaciCellProps {
  taskId: string
  memberId: string
  currentRole: RaciRole | null
  onRoleChange: (role: RaciRole | null) => void
  disabled?: boolean
  isLoading?: boolean
}

const roleColors: Record<RaciRole, string> = {
  RESPONSIBLE: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 border-blue-300 shadow-blue-100',
  ACCOUNTABLE: 'bg-gradient-to-br from-green-50 to-green-100 text-green-900 border-green-300 shadow-green-100',
  CONSULTED: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 border-amber-300 shadow-amber-100',
  INFORMED: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900 border-purple-300 shadow-purple-100',
}

const roleHoverColors: Record<RaciRole, string> = {
  RESPONSIBLE: 'hover:from-blue-100 hover:to-blue-200 hover:shadow-md hover:shadow-blue-200/50',
  ACCOUNTABLE: 'hover:from-green-100 hover:to-green-200 hover:shadow-md hover:shadow-green-200/50',
  CONSULTED: 'hover:from-amber-100 hover:to-amber-200 hover:shadow-md hover:shadow-amber-200/50',
  INFORMED: 'hover:from-purple-100 hover:to-purple-200 hover:shadow-md hover:shadow-purple-200/50',
}

const roleLabels: Record<RaciRole, string> = {
  RESPONSIBLE: 'R',
  ACCOUNTABLE: 'A',
  CONSULTED: 'C',
  INFORMED: 'I',
}

const roleFullNames: Record<RaciRole, string> = {
  RESPONSIBLE: 'Responsible - Does the work',
  ACCOUNTABLE: 'Accountable - Owns the outcome',
  CONSULTED: 'Consulted - Provides input',
  INFORMED: 'Informed - Kept updated',
}

// Define the cycle order: Empty → R → A → C → I → Empty
const roleCycle: (RaciRole | null)[] = [
  null,
  'RESPONSIBLE',
  'ACCOUNTABLE',
  'CONSULTED',
  'INFORMED',
]

export function RaciCell({
  currentRole,
  onRoleChange,
  disabled = false,
  isLoading = false,
}: RaciCellProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = () => {
    if (disabled || isLoading) return

    // Find current position in cycle
    const currentIndex = roleCycle.indexOf(currentRole)
    // Move to next position (wraps around to 0 if at end)
    const nextIndex = (currentIndex + 1) % roleCycle.length
    const nextRole = roleCycle[nextIndex]

    onRoleChange(nextRole!)
  }

  const handleMouseDown = () => setIsPressed(true)
  const handleMouseUp = () => setIsPressed(false)
  const handleMouseLeave = () => setIsPressed(false)

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={disabled || isLoading}
      className={cn(
        'h-14 w-full border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
        'flex items-center justify-center font-bold text-base relative overflow-hidden group',
        'shadow-sm',
        currentRole
          ? `${roleColors[currentRole]} ${roleHoverColors[currentRole]}`
          : 'bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 border-gray-200 hover:border-gray-300 hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !isLoading && 'cursor-pointer active:scale-95',
        isPressed && !disabled && !isLoading && 'scale-95'
      )}
      title={
        currentRole
          ? roleFullNames[currentRole]
          : 'Click to assign a RACI role'
      }
    >
      {/* Ripple effect background */}
      {!disabled && !isLoading && (
        <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      )}

      {/* Content */}
      <span className="relative z-10">
        {isLoading ? (
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : currentRole ? (
          <span className="transform transition-transform duration-200 group-hover:scale-110 inline-block">
            {roleLabels[currentRole]}
          </span>
        ) : (
          <span className="text-gray-400 text-xs font-medium group-hover:text-gray-600 transition-colors">
            —
          </span>
        )}
      </span>

      {/* Shimmer effect on hover for empty cells */}
      {!currentRole && !disabled && !isLoading && (
        <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent animate-shimmer" />
        </span>
      )}
    </button>
  )
}
