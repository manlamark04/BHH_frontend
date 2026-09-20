import { Coffee, ArrowLeft } from 'lucide-react'
import type { View } from '../../types'

interface CafeProps {
  onNavigate: (view: View) => void
}

export default function Cafe({ onNavigate }: CafeProps) {
  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto font-sans min-h-[calc(100vh-120px)] flex flex-col items-center justify-center">
      <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-10 sm:p-16 flex flex-col items-center text-center max-w-lg w-full transition-colors">
        
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-[#6B7A5E]/10 border border-[#6B7A5E]/20 flex items-center justify-center text-[#6B7A5E] mb-6 shadow-inner">
          <Coffee className="w-10 h-10" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-8 tracking-tight">
          Coming Soon
        </h2>

        {/* Back Button */}
        <button
          onClick={() => onNavigate('customer-dashboard')}
          className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-[#6B7A5E] dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  )
}
