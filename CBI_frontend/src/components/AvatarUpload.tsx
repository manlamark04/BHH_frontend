import React, { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Camera, Trash2, X, Upload, Plus } from 'lucide-react'
import Avatar from './Avatar'
import { authApi } from '../api/auth'
import { useToast } from '../context/ToastContext'

interface AvatarUploadProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onUploadSuccess: (newUrl: string) => void
  onRemoveSuccess: () => void
}

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
  const image = new Image()
  image.src = imageSrc
  await new Promise(resolve => { image.onload = resolve })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to match the desired crop size
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(file => {
      if (file) {
        resolve(file)
      } else {
        reject(new Error('Canvas is empty'))
      }
    }, 'image/jpeg', 0.9)
  })
}

export default function AvatarUpload({ name, photoUrl, size = 'lg', onUploadSuccess, onRemoveSuccess }: AvatarUploadProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB', 'Upload Failed')
        return
      }

      const reader = new FileReader()
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null))
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsUploading(true)
    
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const file = new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' })
      
      const res = await authApi.uploadProfilePhoto(file)
      onUploadSuccess(res.profile_photo_url)
      setImageSrc(null) // Close modal
      toast.success('Profile photo updated successfully', 'Photo Updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo', 'Upload Error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return
    
    try {
      await authApi.removeProfilePhoto()
      onRemoveSuccess()
      toast.success('Profile photo removed', 'Photo Removed')
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove photo', 'Remove Error')
    }
  }

  return (
    <>
      <div 
        className="relative inline-block cursor-pointer group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar name={name} photoUrl={photoUrl} size={size} />
        
        {/* Upload Badge (+ icon) */}
        <div className="absolute bottom-0 right-0 bg-white dark:bg-[#181B20] rounded-full p-[2px] shadow-sm transition-transform group-hover:scale-110">
          <div className="bg-[#6B7A5E] text-white rounded-full p-1">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
          </div>
        </div>

        {/* Hover Overlay */}
        <div className={`absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
          <Camera className="w-5 h-5 text-white mb-1" />
          <span className="text-[9px] font-bold text-white uppercase tracking-wider">Change</span>
        </div>

        {/* Remove Button (only show if photo exists and hovering) */}
        {photoUrl && isHovering && (
          <button
            onClick={handleRemove}
            className="absolute -top-1 -right-1 bg-white dark:bg-neutral-800 p-1 rounded-full shadow-md border border-neutral-200 dark:border-neutral-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors z-10"
            title="Remove Photo"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          </button>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg, image/png, image/webp"
          className="hidden"
        />
      </div>

      {/* Crop Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#181B20] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-display font-bold text-neutral-900 dark:text-white">Adjust Profile Photo</h3>
              <button 
                onClick={() => setImageSrc(null)}
                className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative w-full h-[300px] bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 block">
                  Zoom
                </label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#6B7A5E]"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setImageSrc(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-xl bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    'Saving...'
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Save Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
