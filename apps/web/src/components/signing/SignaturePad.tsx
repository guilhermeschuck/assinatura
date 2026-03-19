import { useRef, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { motion } from 'framer-motion'
import { PenLine, RotateCcw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface SignaturePadProps {
  onCapture: (file: File | null, preview: string | null) => void
  preview: string | null
}

export function SignaturePad({ onCapture, preview }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null)

  const handleClear = useCallback(() => {
    sigRef.current?.clear()
  }, [])

  const handleConfirm = useCallback(() => {
    if (!sigRef.current || sigRef.current.isEmpty()) return
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
    sigRef.current.getTrimmedCanvas().toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      onCapture(file, dataUrl)
    }, 'image/png')
  }, [onCapture])

  const handleRetake = useCallback(() => {
    onCapture(null, null)
  }, [onCapture])

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
            alt="Assinatura manuscrita"
            className="max-w-[280px] h-auto border-4 border-[#0F7A5A] rounded-xl bg-white p-2 shadow-lg"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#0F7A5A] rounded-full p-1.5">
            <CheckCircle2 size={20} className="text-white" />
          </div>
        </div>
        <p className="text-sm text-[#0F7A5A] font-medium">Assinatura capturada com sucesso!</p>
        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleRetake}>
          Refazer
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-[#6B7280]">
        <PenLine size={14} className="text-[#1B2E4B]" />
        <span>Assine ou rubrique no quadro abaixo usando o dedo ou mouse:</span>
      </div>

      <div className="rounded-xl border-2 border-[#1B2E4B] bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1B2E4B"
          canvasProps={{
            className: 'w-full',
            style: { width: '100%', height: 200 },
          }}
          backgroundColor="rgba(255,255,255,1)"
        />
      </div>
      <p className="text-xs text-[#9CA3AF] text-center -mt-2">Área de assinatura</p>

      <div className="flex gap-3 justify-center">
        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleClear}>
          Limpar
        </Button>
        <Button size="sm" icon={<PenLine size={14} />} onClick={handleConfirm}>
          Confirmar Assinatura
        </Button>
      </div>
    </div>
  )
}
