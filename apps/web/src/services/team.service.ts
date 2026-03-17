import api from './api'

export interface TeamMember {
  id: number
  name: string
  email: string
  role: 'admin' | 'lawyer'
  oab_number: string | null
  phone: string | null
  created_at: string
}

export interface CreateMemberData {
  name: string
  email: string
  role: 'admin' | 'lawyer'
  oab_number?: string
  phone?: string
}

export interface UpdateMemberData {
  name: string
  role: 'admin' | 'lawyer'
  oab_number?: string
  phone?: string
}

export const teamService = {
  list: (params?: { search?: string }) =>
    api.get<{ data: TeamMember[] }>('/team', { params }),

  create: (data: CreateMemberData) =>
    api.post<{ data: TeamMember }>('/team', data),

  update: (id: number, data: UpdateMemberData) =>
    api.put<{ data: TeamMember }>(`/team/${id}`, data),

  remove: (id: number) =>
    api.delete(`/team/${id}`),

  resetPassword: (id: number) =>
    api.post(`/team/${id}/reset-password`),
}
