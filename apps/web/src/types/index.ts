// ---------------------------------------------------------------------------
// Tipos do domínio — espelham os Models do Laravel
// ---------------------------------------------------------------------------

export type UserRole = 'admin' | 'lawyer'

export interface User {
  id: number
  name: string
  email: string
  oab_number: string | null
  role: UserRole
  phone: string | null
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  user_id: number
  name: string
  cpf: string
  email: string
  whatsapp: string | null
  created_at: string
  updated_at: string
}

export type DocumentStatus =
  | 'pending'
  | 'client_signed'
  | 'processing'
  | 'completed'
  | 'expired'
  | 'cancelled'

export interface Document {
  id: number
  user_id: number
  client_id: number
  title: string
  signing_token: string
  status: DocumentStatus
  status_label: string
  signing_url: string
  original_hash: string | null
  final_hash: string | null
  signed_file_url: string | null
  expires_at: string | null
  client_signed_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // relações carregadas via eager loading
  client?: Client
  lawyer?: User
  client_signature?: Signature
  lawyer_signature?: Signature
}

export type SignatureType = 'electronic' | 'digital_icp'
export type SignerType = 'client' | 'lawyer'

export interface Signature {
  id: number
  document_id: number
  signer_type: SignerType
  signer_id: number | null
  signer_name: string | null
  signer_cpf: string | null
  signer_email: string | null
  ip_address: string | null
  user_agent: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  selfie_url: string | null
  signature_type: SignatureType
  signature_type_label: string
  certificate_id: number | null
  document_hash: string | null
  signed_at: string
  created_at: string
}

export interface Certificate {
  id: number
  user_id: number
  issuer: string | null
  subject: string | null
  serial_number: string | null
  cpf_cnpj: string | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  days_until_expiration: number | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Tipos de API
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    from: number
    to: number
    per_page: number
    total: number
  }
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// Tipos do wizard de assinatura do cliente
// ---------------------------------------------------------------------------

export interface SigningWizardData {
  accepted_terms: boolean
  latitude: number | null
  longitude: number | null
  timezone: string
  selfie_file: File | null
  selfie_preview: string | null
}

export interface PublicDocumentResponse {
  document: {
    id: number
    title: string
    status: DocumentStatus
    expires_at: string | null
    lawyer_name: string
    firm_name: string
  }
  client: {
    name: string
    cpf: string
    email: string
  }
  pdf_url: string
}

// ---------------------------------------------------------------------------
// Tipos de formulários
// ---------------------------------------------------------------------------

export interface LoginForm {
  email: string
  password: string
}

export interface CreateDocumentForm {
  title: string
  pdf_file: FileList
  client_id: number | null
  // ou novo cliente
  new_client: {
    name: string
    cpf: string
    email: string
    whatsapp: string
  } | null
  expiration_days: number
}

export interface UploadCertificateForm {
  pfx_file: FileList
  password: string
}
