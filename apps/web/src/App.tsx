import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/dashboard/AppLayout'

const Login               = lazy(() => import('@/pages/Login'))
const Dashboard           = lazy(() => import('@/pages/Dashboard'))
const Sign                = lazy(() => import('@/pages/Sign'))
const DocumentList        = lazy(() => import('@/pages/DocumentList'))
const NewDocument         = lazy(() => import('@/pages/NewDocument'))
const DocumentDetail      = lazy(() => import('@/pages/DocumentDetail'))
const Clients             = lazy(() => import('@/pages/Clients'))
const CertificateSettings = lazy(() => import('@/pages/CertificateSettings'))
const Team                = lazy(() => import('@/pages/Team'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
      <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />
          <Route path="/sign/:token" element={<Sign />} />

          {/* Autenticada */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<DocumentList />} />
            <Route path="/documents/new" element={<NewDocument />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings/certificate" element={<CertificateSettings />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
