import React, { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, ShieldCheck, Banknote, CreditCard, Receipt } from 'lucide-react'

export interface PaymentProcessingState {
  isOpen: boolean
  step: 'processing' | 'success'
  amount?: number | string
  method?: string
  invoiceNumber?: string
  customerName?: string
}

interface PaymentProcessingModalProps {
  state: PaymentProcessingState
}

export const PaymentProcessingModal: React.FC<PaymentProcessingModalProps> = ({ state }) => {
  const { isOpen, step, amount, method, invoiceNumber, customerName } = state
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0)
      return
    }

    if (step === 'success') {
      setCurrentStepIndex(2)
      return
    }

    // Step progression animation while processing
    setCurrentStepIndex(0)
    const timer1 = setTimeout(() => {
      setCurrentStepIndex(1)
    }, 450)

    const timer2 = setTimeout(() => {
      setCurrentStepIndex(2)
    }, 950)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [isOpen, step])

  if (!isOpen) return null

  const isSuccess = step === 'success'

  const formattedAmount =
    amount !== undefined && amount !== ''
      ? `₱${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null

  const stepsList = [
    { label: 'Verifying payment details & account balance' },
    { label: 'Recording transaction to cashier ledger' },
    { label: 'Generating official receipt & invoice stamp' },
  ]

  const getMethodIcon = () => {
    const m = (method || '').toLowerCase()
    if (m.includes('cash')) return <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    if (m.includes('rebooking') || m.includes('credit')) return <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
    return <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      aria-live="polite"
      role="status"
    >
      <div className="relative w-full max-w-md bg-[#FAF7F0] dark:bg-[#181B20] border border-stone-300/70 dark:border-neutral-800 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden p-6 sm:p-7 text-neutral-900 dark:text-neutral-100 transition-all duration-300">
        
        {/* Subtle decorative top gradient bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500 ${
          isSuccess 
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600' 
            : 'bg-gradient-to-r from-[#6B7A5E] via-[#8B9B7E] to-[#4F5D45] animate-pulse'
        }`} />

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          
          {/* Animated Hero Graphic */}
          <div className="relative flex items-center justify-center my-1">
            {/* Outer spinning dash ring when processing */}
            {!isSuccess && (
              <div className="absolute w-24 h-24 rounded-full border-2 border-dashed border-[#6B7A5E]/40 dark:border-[#6B7A5E]/60 animate-spin" style={{ animationDuration: '6s' }} />
            )}

            {/* Pulsing ring halo */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
              isSuccess
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30 scale-105'
                : 'bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 text-[#6B7A5E] dark:text-[#8B9B7E] ring-8 ring-[#6B7A5E]/5 dark:ring-[#6B7A5E]/10'
            }`}>
              {isSuccess ? (
                <CheckCircle2 className="w-10 h-10 animate-scaleIn stroke-[2.5]" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <Receipt className="w-9 h-9 stroke-[1.8]" />
                  <Loader2 className="w-5 h-5 animate-spin text-[#6B7A5E] absolute -bottom-2 -right-2 bg-white dark:bg-neutral-800 rounded-full p-0.5 shadow-sm" />
                </div>
              )}
            </div>
          </div>

          {/* Title & Status */}
          <div className="space-y-1">
            <h3 className="font-display text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {isSuccess ? 'Payment Successfully Recorded!' : 'Processing Payment...'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
              {isSuccess
                ? 'Opening official receipt and updating audit trail...'
                : 'Please wait while we record the transaction and generate your official receipt.'}
            </p>
          </div>

          {/* Payment Snapshot Pill */}
          {(formattedAmount || customerName || invoiceNumber) && (
            <div className="w-full bg-white dark:bg-neutral-900/80 border border-stone-200/80 dark:border-neutral-800 rounded-2xl p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">Payment Amount</span>
                <span className="font-bold text-base text-neutral-900 dark:text-white">
                  {formattedAmount || '—'}
                </span>
              </div>

              {(method || customerName || invoiceNumber) && (
                <div className="pt-2 border-t border-stone-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-medium truncate max-w-[180px]">
                    {getMethodIcon()}
                    <span className="truncate">{method ? method.replace('_', ' ') : 'Cash'}</span>
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400 truncate max-w-[150px] text-right">
                    {customerName || invoiceNumber || 'Guest Payment'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stepped Status Indicators */}
          <div className="w-full space-y-2 text-left pt-1">
            {stepsList.map((item, idx) => {
              const isDone = isSuccess || idx < currentStepIndex
              const isCurrent = !isSuccess && idx === currentStepIndex

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                      : isCurrent
                        ? 'bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 text-[#4F5D45] dark:text-[#A1B294] font-medium'
                        : 'text-neutral-400 dark:text-neutral-600'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-[#6B7A5E] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700 shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}

export default PaymentProcessingModal
