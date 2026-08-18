import { useState } from 'react'
import MotorRentSection from '../../components/MotorRentSection'

interface Props {
  customerId: string
  customerName: string
}

export default function CustomerMotorcycles({ customerId, customerName }: Props) {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <MotorRentSection customerId={customerId} customerName={customerName} />
    </div>
  )
}
