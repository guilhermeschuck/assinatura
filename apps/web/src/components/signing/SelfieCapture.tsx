import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Camera, RotateCcw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

interface SelfieCaptureProps {
  onCapture: (file: File, preview: string) => void
  preview:   string | null
}

export function SelfieCapture({ onCapture, preview }: SelfieCaptureProps) {
  const [streaming, setStreaming] = useState(false)
  const [error, setError]        = useState<string | null>(null)

  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStreaming(false)
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      // Aguarda o video element estar disponível no DOM
      const tryAttach = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          setStreaming(true)
        } else {
          requestAnimationFrame(tryAttach)
        }
      }
      tryAttach()
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }, [])

  // Inicia a câmera automaticamente quando não há preview
  useEffect(() => {
    if (!preview) {
      startCamera()
    }
    return () => stopCamera()
  }, [preview, startCamera, stopCamera])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')!
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file      = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      const previewUrl = canvas.toDataURL('image/jpeg', 0.9)
      stopCamera()
      onCapture(file, previewUrl)
    }, 'image/jpeg', 0.9)
  }, [stopCamera, onCapture])

  const handleRetake = useCallback(() => {
    onCapture(null as any, null as any)
  }, [onCapture])

  // Preview da foto capturada
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
          onClick={handleRetake}
        >
          Refazer
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="info">
        <strong>Segure seu documento de identidade (RG ou CNH) próximo ao seu rosto</strong> e tire uma selfie.
        Isso comprova sua identidade e garante a validade jurídica da assinatura.
      </Alert>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-xl overflow-hidden border-2 border-[#1B2E4B] bg-black min-h-[240px] w-full max-w-sm flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full"
            style={{ transform: 'scaleX(-1)' }}
            muted
            playsInline
            autoPlay
          />
          {!streaming && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-white text-sm">Abrindo câmera...</div>
            </div>
          )}
          <div className="absolute inset-0 border-4 border-[#C9A84C]/40 rounded-xl pointer-events-none" />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {streaming && (
          <Button size="md" icon={<Camera size={16} />} onClick={capturePhoto}>
            Capturar Foto
          </Button>
        )}
      </div>
    </div>
  )
}
