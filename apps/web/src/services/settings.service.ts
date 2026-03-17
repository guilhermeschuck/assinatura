import api from './api'

export interface MailSettings {
  mail_from_name: string
  mail_from_address: string
  mail_mailer: 'smtp' | 'log' | 'sendmail'
  mail_host: string
  mail_port: string
  mail_username: string
  mail_password: string
  mail_encryption: 'tls' | 'ssl' | ''
}

export const settingsService = {
  get: () =>
    api.get<{ data: MailSettings }>('/settings'),

  update: (data: MailSettings) =>
    api.put<{ message: string }>('/settings', data),
}
