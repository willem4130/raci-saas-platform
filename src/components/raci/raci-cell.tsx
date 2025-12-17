'use client'

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
  RESPONSIBLE: 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200',
  ACCOUNTABLE: 'bg-green-100 text-green-900 border-green-300 hover:bg-green-200',
  CONSULTED: 'bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-200',
  INFORMED: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
}

const roleLabels: Record<RaciRole, string> = {
  RESPONSIBLE: 'R',
  ACCOUNTABLE: 'A',
  CONSULTED: 'C',
  INFORMED: 'I',
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
  const handleClick = () => {
    if (disabled || isLoading) return

    // Find current position in cycle
    const currentIndex = roleCycle.indexOf(currentRole)
    // Move to next position (wraps around to 0 if at end)
    const nextIndex = (currentIndex + 1) % roleCycle.length
    const nextRole = roleCycle[nextIndex]

    onRoleChange(nextRole!)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        'h-12 w-full border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500',
        'flex items-center justify-center font-semibold text-sm relative',
        currentRole ? roleColors[currentRole] : 'bg-gray-50 hover:bg-gray-100 border-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !isLoading && 'cursor-pointer'
      )}
      title={
        currentRole
          ? `Click to change from ${currentRole}`
          : 'Click to assign a RACI role'
      }
    >
      {isLoading ? (
        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        currentRole && roleLabels[currentRole]
      )}
    </button>
  )
}
