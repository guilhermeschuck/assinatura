import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

interface Step {
  label: string
}

interface StepIndicatorProps {
  steps:       Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent   = index === currentStep

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted ? '#0F7A5A' : isCurrent ? '#1B2E4B' : '#E2DDD5',
                  scale: isCurrent ? 1.1 : 1,
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ color: isCompleted || isCurrent ? '#fff' : '#6B7280' }}
              >
                {isCompleted ? <Check size={14} /> : index + 1}
              </motion.div>
              <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-[#1B2E4B]' : 'text-[#6B7280]'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className="h-px w-8 sm:w-12 mx-1 transition-colors duration-300"
                style={{ backgroundColor: isCompleted ? '#0F7A5A' : '#E2DDD5' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
