import api from './api'
import type { Certificate, ApiResponse } from '@/types'

export const certificatesService = {
  list() {
    return api.get<ApiResponse<Certificate[]>>('/certificates')
  },

  upload(data: FormData) {
    return api.post<ApiResponse<Certificate>>('/certificates', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deactivate(id: number) {
    return api.delete<ApiResponse<void>>(`/certificates/${id}`)
  },
}
