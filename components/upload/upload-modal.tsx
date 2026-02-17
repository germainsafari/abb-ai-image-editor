"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

// Cloud upload icon – using ABB pictogram SVG
function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <img
      src="/Pictograms.svg"
      alt="Upload pictogram"
      className={className}
      width={44}
      height={30}
    />
  )
}

// Upload arrow icon for button – reduced ABB icon SVG
function UploadArrowIcon({ className }: { className?: string }) {
  return (
    <img
      src="/upload-reduced.svg"
      alt="Upload"
      className={className}
      width={20}
      height={20}
    />
  )
}

interface UploadContentProps {
  onImageUploaded: (imageUrl: string) => void
  containerWidth?: string
  // Optional: signal parent that upload has started so it can switch UI (e.g. to refining view)
  onUploadStart?: () => void
  // Optional: provide a local preview URL (object URL) immediately when a file is selected
  onLocalPreview?: (previewUrl: string) => void
  // Optional: hide this upload card while uploading so only parent UI is visible
  hideWhileUploading?: boolean
}

async function gradeImageWithMicroservice(file: File) {
  const baseUrl = process.env.NEXT_PUBLIC_GRADING_API_URL
  if (!baseUrl) {
    console.warn("NEXT_PUBLIC_GRADING_API_URL is not set; skipping grading microservice call.")
    return null
  }

  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(
    `${baseUrl}/api/grade?use_ai=true&use_contrast=true`,
    {
      method: "POST",
      body: formData,
    },
  )

  if (!res.ok) {
    console.error("Grading microservice call failed:", res.status, res.statusText)
    return null
  }

  const matchedRef = res.headers.get("X-Matched-Reference")
  const confidence = res.headers.get("X-Match-Confidence")
  const blob = await res.blob()
  const gradedUrl = URL.createObjectURL(blob)

  return {
    gradedUrl,
    matchedRef,
    confidence: confidence ? Number(confidence) : null,
  }
}

// Reusable upload content component (can be used embedded or in modal)
export function UploadContent({ onImageUploaded, containerWidth = "890px", onUploadStart, onLocalPreview, hideWhileUploading }: UploadContentProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [formatError, setFormatError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    const file = e.dataTransfer.files[0]
    if (!file) return

    // Provide immediate local preview before upload
    const localUrl = URL.createObjectURL(file)
    onLocalPreview?.(localUrl)

    await uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Provide immediate local preview before upload
    const localUrl = URL.createObjectURL(file)
    onLocalPreview?.(localUrl)

    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'application/postscript']
    if (!validTypes.includes(file.type)) {
      setFormatError(true)
      return
    }

    setFormatError(false)
    setError(null)
    setIsUploading(true)
    // Let parent know upload has started so it can switch to refining UI
    onUploadStart?.()

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      const imageUrl = data.imageUrl

      if (!imageUrl) {
        throw new Error('No image URL returned from server')
      }
      
      let finalImageUrl = imageUrl

      try {
        const gradingResult = await gradeImageWithMicroservice(file)
        if (gradingResult?.gradedUrl) {
          finalImageUrl = gradingResult.gradedUrl

          try {
            if (gradingResult.matchedRef) {
              localStorage.setItem("lastMatchedReference", gradingResult.matchedRef)
            }
            if (typeof gradingResult.confidence === "number") {
              localStorage.setItem(
                "lastMatchedReferenceConfidence",
                gradingResult.confidence.toString(),
              )
            }
          } catch (storageError) {
            console.warn("Failed to store grading metadata in localStorage", storageError)
          }
        }
      } catch (gradingError) {
        console.error("Error calling grading microservice; falling back to original image URL.", gradingError)
      }

      try {
        localStorage.setItem("lastUploadedImage", finalImageUrl)
        localStorage.setItem("lastUploadedFileName", data.fileName || file.name)
      } catch (storageError) {
        console.warn("Failed to store lastUploadedImage in localStorage", storageError)
      }

      onImageUploaded(finalImageUrl)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed. Please try again."
      setError(errorMessage)
      setIsUploading(false)
    }
  }

  const isActiveState = isDragActive || isHovered
  
  const getZoneStyles = () => {
    if (formatError) return "bg-[#FFEBE6]"
    if (isDragActive || isHovered) return "bg-[#F5F4FF]"
    return "bg-white"
  }

  const getDropzoneClass = () => {
    if (formatError) return "upload-dropzone upload-dropzone-error"
    if (isDragActive || isHovered) return "upload-dropzone upload-dropzone-hover"
    return "upload-dropzone"
  }

  if (isUploading && hideWhileUploading) {
    // Parent (e.g. refining modal) will show its own UI while upload is in progress
    return null
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-2xl animate-fade-in mx-4"
      style={{ width: containerWidth, maxWidth: '100%' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-center pt-[56px] pr-[40px] pb-0 pl-[40px] relative">
        <h2 
          className="text-[32px] font-bold tracking-tight uppercase"
          style={{ fontFamily: 'var(--font-abb-voice-display)' }}
        >
          Upload Your Image
        </h2>
      </div>

      {/* Drop zone */}
      <div className="pt-[40px] pr-[40px] pb-[56px] pl-[40px]">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onMouseEnter={() => !isUploading && setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false)
            setIsDragActive(false)
          }}
          className={`p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${getZoneStyles()} ${getDropzoneClass()} ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{
            lineHeight: isActiveState ? "1.6" : "1.5",
          }}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".jpg,.jpeg,.png,.eps"
            onChange={handleFileSelect}
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-[#E30613] animate-spin" />
              <p className="text-sm text-gray-600">Processing image...</p>
            </div>
          ) : formatError ? (
            <>
              <div className="flex justify-center mb-4">
                <CloudUploadIcon className="w-11 h-[30px]" />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                The uploaded asset is in a format other than one of our supported formats.
              </p>
              <p className="text-sm text-gray-600 mb-5">
                Supported formats: <span className="font-semibold">JPG, PNG, EPS.</span>
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFormatError(false)
                  document.getElementById('file-upload')?.click()
                }}
                className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#c70510] text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
              >
                Upload image
                <UploadArrowIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex justify-center mb-4">
                <CloudUploadIcon className="w-11 h-[30px]" />
              </div>
              <p className="text-sm text-gray-600 mb-1 transition-all duration-200">
                Drag & drop your file here, or upload it using the button below.
              </p>
              <p className="text-xs text-gray-500 transition-all duration-200">
                Supported formats: <span className="font-semibold">JPG, PNG, EPS</span>
              </p>
              <p className="text-xs text-gray-500 mb-5 transition-all duration-200">
                Max file size: <span className="font-semibold">20 MB</span>
              </p>
              <span className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#c70510] text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors">
                Upload image
                <UploadArrowIcon className="w-4 h-4" />
              </span>
            </label>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  )
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onImageUploaded: (imageUrl: string) => void
}

// Full modal wrapper (with overlay)
export default function UploadModal({ isOpen, onClose, onImageUploaded }: UploadModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <UploadContent 
        onImageUploaded={onImageUploaded}
        containerWidth="512px"
      />
    </div>
  )
}
