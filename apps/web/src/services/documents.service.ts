import api from './api'
import type {
  Document,
  PaginatedResponse,
  ApiResponse,
  PublicDocumentResponse,
} from '@/types'

export const documentsService = {
  list(params?: { status?: string; page?: number; search?: string }) {
    return api.get<PaginatedResponse<Document>>('/documents', { params })
  },

  get(id: number) {
    return api.get<ApiResponse<Document>>(`/documents/${id}`)
  },

  create(data: FormData) {
    return api.post<ApiResponse<Document>>('/documents', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  cancel(id: number) {
    return api.patch<ApiResponse<Document>>(`/documents/${id}/cancel`)
  },

  signAsLawyer(id: number) {
    return api.post<ApiResponse<Document>>(`/documents/${id}/sign-lawyer`)
  },

  resendLink(id: number) {
    return api.post(`/documents/${id}/resend-link`)
  },

  download(id: number) {
    return api.get(`/documents/${id}/download`, { responseType: 'blob' })
  },

  // Área pública do cliente
  getPublic(token: string) {
    return api.get<ApiResponse<PublicDocumentResponse>>(`/public/sign/${token}`)
  },

  submitClientSignature(token: string, data: FormData) {
    return api.post<ApiResponse<{ message: string }>>(`/public/sign/${token}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getPublicPdf(token: string) {
    return api.get(`/public/sign/${token}/pdf`, { responseType: 'blob' })
  },

  stats() {
    return api.get<ApiResponse<{
      total: number
      pending: number
      client_signed: number
      completed: number
    }>>('/dashboard/stats')
  },
}
