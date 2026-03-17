import api from './api'
import type { PaginatedResponse } from '@/types'

export interface ActivityLogEntry {
  id: number
  action: string
  subject_type: string | null
  subject_id: number | null
  description: string
  metadata: Record<string, string> | null
  created_at: string
  user: {
    id: number
    name: string
    email: string
    role: 'admin' | 'lawyer'
  } | null
}

export const activityService = {
  list: (params?: { action?: string; search?: string; page?: number }) =>
    api.get<PaginatedResponse<ActivityLogEntry>>('/activity-logs', { params }),
}
