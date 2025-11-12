import { Check } from 'lucide-react'

const STEPS = [
  { number: 1, label: 'Availability' },
  { number: 2, label: 'Details' },
  { number: 3, label: 'Payment' }
]

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step.number} className="flex items-center">
          {/* Step Circle */}
          <div className="flex items-center gap-2">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${
                  currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : currentStep === step.number
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {currentStep > step.number ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>

          {/* Arrow */}
          {index < STEPS.length - 1 && (
            <svg
              className="w-4 h-4 mx-3 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}
