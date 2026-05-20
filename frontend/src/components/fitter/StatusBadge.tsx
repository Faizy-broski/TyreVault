import { Badge } from '@/components/ui/badge'
import type { JobStatus } from '@/types/fitter.types'

const STYLE: Record<JobStatus, string> = {
  pending:     'bg-blue-100 text-blue-600 hover:bg-blue-100',
  assigned:    'bg-blue-100 text-blue-700 hover:bg-blue-100',
  accepted:    'bg-amber-100 text-amber-600 hover:bg-amber-100',
  rejected:    'bg-red-100 text-red-600 hover:bg-red-100',
  in_progress: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  completed:   'bg-green-100 text-green-700 hover:bg-green-100',
  cancelled:   'bg-red-100 text-red-500 hover:bg-red-100',
}

export const STATUS_LABEL: Record<JobStatus, string> = {
  pending:     'New Request',
  assigned:    'Assigned',
  accepted:    'Accepted',
  rejected:    'Rejected',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border-0 ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
