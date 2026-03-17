import api from './api'
import type { User, ApiResponse } from '@/types'

export const authService = {
  login(email: string, password: string) {
    return api.post<{ token: string; user: User }>('/auth/login', { email, password })
  },

  logout() {
    return api.post('/auth/logout')
  },

  me() {
    return api.get<ApiResponse<User>>('/auth/me')
  },
}
