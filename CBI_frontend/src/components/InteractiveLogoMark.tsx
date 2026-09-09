import React from 'react'
import logo from '../imports/logo.png'

interface InteractiveLogoMarkProps {
  size?: 'sm' | 'md' | 'lg' | string
  className?: string
  alt?: string
}

const SIZE_MAP: Record<string, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
}

export const InteractiveLogoMark: React.FC<InteractiveLogoMarkProps> = ({
  size = 'md',
  className = '',
  alt = 'Cambacay Breeze Inn',
}) => {
  const sizeClass = SIZE_MAP[size] || size

  return (
    <div
      className={`logo-flip-container relative ${sizeClass} select-none shrink-0 cursor-pointer ${className}`}
      aria-label={`${alt} (Emblem with continuous 3D flip)`}
    >
      <div className="logo-flip-inner w-full h-full">
        {/* ─── FRONT FACE: Authentic Cambacay Breeze Inn Logo ─── */}
        <div className="logo-face logo-face-front overflow-hidden p-0.5">
          <img
            src={logo}
            alt={alt}
            className="w-full h-full object-contain filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            draggable={false}
          />
        </div>

        {/* ─── BACK FACE: Authentic Cambacay Breeze Inn Logo (Identical artwork) ─── */}
        <div className="logo-face logo-face-back overflow-hidden p-0.5">
          <img
            src={logo}
            alt={alt}
            className="w-full h-full object-contain filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}

export default InteractiveLogoMark
