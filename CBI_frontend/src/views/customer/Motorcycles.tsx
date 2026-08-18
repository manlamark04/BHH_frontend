import { useState } from 'react'
import MotorRentSection from '../../components/MotorRentSection'

interface Props {
  customerId: string
  customerName: string
}

export default function CustomerMotorcycles({ customerId, customerName }: Props) {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Motorcycle Rental (Motor Rent)</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Explore Bohol, Chocolate Hills & Batuan on two wheels</p>
        </div>
      </div>

      {/* ─── 2. MOTOR RENT SECTION ─── */}
      <MotorRentSection customerId={customerId} customerName={customerName} />
    </div>
  )
}
