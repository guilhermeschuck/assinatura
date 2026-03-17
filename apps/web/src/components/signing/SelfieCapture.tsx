import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, RotateCcw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

interface SelfieCaptureProps {
  onCapture: (file: File, preview: string) => void
  preview:   string | null
}

export function SelfieCapture({ onCapture, preview }: SelfieCaptureProps) {
  const [mode, setMode]         = useState<'choose' | 'camera' | 'upload'>('choose')
  const [streaming, setStream]  = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStream(false)
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStream(true)
      setMode('camera')
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador ou use a opção de upload.')
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (! videoRef.current || ! canvasRef.current) return

    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')!
    // Espelha horizontalmente para selfie natural
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)

    canvas.toBlob((blob) => {
      if (! blob) return
      const file    = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      const preview = canvas.toDataURL('image/jpeg', 0.9)
      stopCamera()
      onCapture(file, preview)
    }, 'image/jpeg', 0.9)
  }, [stopCamera, onCapture])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (! file) return

    if (! ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG ou WebP.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      onCapture(file, ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [onCapture])

  // Se já tem preview, mostra a foto capturada
  if (preview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <img
            src={preview}
            alt="Selfie com documento"
            className="w-56 h-56 object-cover rounded-xl border-4 border-[#0F7A5A] shadow-lg"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#0F7A5A] rounded-full p-1.5">
            <CheckCircle2 size={20} className="text-white" />
          </div>
        </div>
        <p className="text-sm text-[#0F7A5A] font-medium">Selfie capturada com sucesso!</p>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={14} />}
          onClick={() => { setMode('choose'); stopCamera() }}
        >
          Refazer
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="info">
        <strong>Segure seu documento de identidade (RG ou CNH) próximo ao seu rosto</strong> e tire uma selfie. Isso comprova sua identidade e garante a validade jurídica da assinatura.
      </Alert>

      {error && <Alert variant="error">{error}</Alert>}

      <AnimatePresence mode="wait">
        {mode === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <button
              onClick={startCamera}
              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-[#E2DDD5] rounded-xl hover:border-[#C9A84C] hover:bg-[#FDFCF9] transition-all group"
            >
              <div className="w-12 h-12 bg-[#F0EDE8] rounded-xl flex items-center justify-center group-hover:bg-[#C9A84C]/10 transition-colors">
                <Camera size={24} className="text-[#1B2E4B]" />
              </div>
              <span className="text-sm font-medium text-[#1B2E4B]">Usar câmera</span>
            </button>
            <button
              onClick={() => { setMode('upload'); inputRef.current?.click() }}
              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-[#E2DDD5] rounded-xl hover:border-[#C9A84C] hover:bg-[#FDFCF9] transition-all group"
            >
              <div className="w-12 h-12 bg-[#F0EDE8] rounded-xl flex items-center justify-center group-hover:bg-[#C9A84C]/10 transition-colors">
                <Upload size={24} className="text-[#1B2E4B]" />
              </div>
              <span className="text-sm font-medium text-[#1B2E4B]">Fazer upload</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />
          </motion.div>
        )}

        {mode === 'camera' && streaming && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative rounded-xl overflow-hidden border-2 border-[#1B2E4B]">
              <video
                ref={videoRef}
                className="w-full max-w-sm"
                style={{ transform: 'scaleX(-1)' }}
                muted
                playsInline
              />
              <div className="absolute inset-0 border-4 border-[#C9A84C]/40 rounded-xl pointer-events-none" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => { stopCamera(); setMode('choose') }}>
                Cancelar
              </Button>
              <Button size="md" icon={<Camera size={16} />} onClick={capturePhoto}>
                Capturar Foto
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
