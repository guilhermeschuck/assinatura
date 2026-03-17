import api from './api'
import type { Client, ApiResponse, PaginatedResponse } from '@/types'

export const clientsService = {
  list(params?: { search?: string; page?: number }) {
    return api.get<PaginatedResponse<Client>>('/clients', { params })
  },

  get(id: number) {
    return api.get<ApiResponse<Client>>(`/clients/${id}`)
  },

  create(data: Partial<Client>) {
    return api.post<ApiResponse<Client>>('/clients', data)
  },

  update(id: number, data: Partial<Client>) {
    return api.put<ApiResponse<Client>>(`/clients/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/clients/${id}`)
  },
}
