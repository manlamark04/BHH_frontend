import React from 'react'

interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ name, photoUrl, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)

  // Reset error state if photoUrl changes
  React.useEffect(() => {
    setImgError(false)
  }, [photoUrl])

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?'
  }

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  }

  const baseClasses = "rounded-full flex items-center justify-center shrink-0 object-cover shadow-xs"
  const defaultBg = "bg-[#6B7A5E] text-white font-display font-bold"

  // Base URL for the uploaded photos
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  if (photoUrl && !imgError) {
    const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${baseUrl}${photoUrl}`
    return (
      <img 
        src={fullUrl} 
        alt={`${name}'s avatar`}
        className={`${baseClasses} ${sizeClasses[size]} ${className}`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={`${baseClasses} ${defaultBg} ${sizeClasses[size]} ${className}`}>
      {getInitials(name)}
    </div>
  )
}
