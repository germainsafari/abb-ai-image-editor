"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ABBLoader } from "@/components/icons/abb-loader"
import type { ImageState } from "@/types/editor"
import MetadataStep1 from "./metadata/metadata-step1"
import MetadataStep2 from "./metadata/metadata-step2"
import DownloadStep from "./metadata/download-step"

interface DownloadModalProps {
  isOpen: boolean
  imageState: ImageState
  onClose: () => void
  skipToDownload?: boolean
}

interface SourceInfo {
  business: string
  campaign: string
  campaignEnabled: boolean
  product: string
  productEnabled: boolean
  assetType: string
}

interface MetadataResult {
  title: string
  description: string
  tags: string[]
}

type ModalStep = "download" | "metadata-step1" | "metadata-step2" | "downloading" | "next-step"

// Match stock patterns anywhere in filename (handles timestamp prefix e.g. 1769946221743-AdobeStock_356666639942.jpg)
const ADOBE_STOCK_PATTERN = /Adobe\s*Stock[_\s](\d+)/i
const SHUTTERSTOCK_PATTERN = /Shutterstock[_\s](\d+)/i
const GETTY_PATTERN = /Getty\s*Images?[_\s](\d+)/i

function isAdobeStock(filename?: string): boolean {
  if (!filename) return false
  const base = filename.replace(/\.[^/.]+$/, "").trim()
  return ADOBE_STOCK_PATTERN.test(base)
}

// Check if filename indicates a stock image (Adobe Stock, Shutterstock, Getty)
function isStockImage(filename?: string): boolean {
  if (!filename) return false
  const base = filename.replace(/\.[^/.]+$/, "").trim()
  return (
    ADOBE_STOCK_PATTERN.test(base) ||
    SHUTTERSTOCK_PATTERN.test(base) ||
    GETTY_PATTERN.test(base)
  )
}

function extractAdobeStockId(filename?: string): string | null {
  if (!filename) return null
  const match = filename.replace(/\.[^/.]+$/, "").match(ADOBE_STOCK_PATTERN)
  return match ? match[1] : null
}

// Generate filename based on new naming convention
function generateFileName(sourceInfo: SourceInfo, originalFileName?: string): string {
  // If Adobe Stock, keep original format: Adobe Stock_ID number
  if (isAdobeStock(originalFileName)) {
    const stockId = extractAdobeStockId(originalFileName)
    if (stockId) {
      return `Adobe Stock_${stockId}`
    }
  }

  // If nothing is filled in, keep original filename (without extension)
  if (!sourceInfo.business && !sourceInfo.campaign && !sourceInfo.product && !sourceInfo.assetType) {
    if (originalFileName) {
      return originalFileName.replace(/\.[^/.]+$/, "")
    }
    return "image"
  }

  const parts: string[] = []

  // 1. Division/Business name (if not Corporate)
  if (sourceInfo.business && sourceInfo.business !== "Corporate") {
    parts.push(sourceInfo.business.replace(/\s+/g, ""))
  }

  // 2. Campaign - if applicable
  if (sourceInfo.campaignEnabled && sourceInfo.campaign.trim()) {
    parts.push(sourceInfo.campaign.trim().replace(/\s+/g, "_"))
  }

  // 3. Product - if applicable
  if (sourceInfo.productEnabled && sourceInfo.product.trim()) {
    parts.push(sourceInfo.product.trim().replace(/\s+/g, "_"))
  }

  // 4. Asset type (if not Photo)
  if (sourceInfo.assetType && sourceInfo.assetType !== "Photo") {
    parts.push(sourceInfo.assetType.replace(/\s+/g, ""))
  }

  return parts.length > 0 ? parts.join("_") : originalFileName?.replace(/\.[^/.]+$/, "") || "image"
}

export default function DownloadModal({ isOpen, imageState, onClose, skipToDownload = false }: DownloadModalProps) {
  const [step, setStep] = useState<ModalStep>("download")
  const [format, setFormat] = useState<"PNG" | "JPG">("JPG")
  const [transparentBg, setTransparentBg] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false)

  // Metadata state
  const [sourceInfo, setSourceInfo] = useState<SourceInfo>({
    business: "",
    campaign: "",
    campaignEnabled: false,
    product: "",
    productEnabled: false,
    assetType: "",
  })
  const [metadata, setMetadata] = useState<MetadataResult>({
    title: "",
    description: "",
    tags: [],
  })
  const [newTag, setNewTag] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [metadataApplied, setMetadataApplied] = useState(false)
  const [isApplyingMetadata, setIsApplyingMetadata] = useState(false)
  
  // AI detection state
  const [aiDetectionResult, setAiDetectionResult] = useState<{
    isAIGenerated: boolean
    probability: number
  } | null>(null)

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setStep("download")
      setShowDownloadSuccess(false)
      setMetadataApplied(false)
      setSourceInfo({
        business: "",
        campaign: "",
        campaignEnabled: false,
        product: "",
        productEnabled: false,
        assetType: "",
      })
      setMetadata({
        title: "",
        description: "",
        tags: [],
      })
      setTransparentBg(false)
      setAiDetectionResult(null)
    } else {
      if (!skipToDownload) {
        setStep("metadata-step1")
        // Defaults: Division=Corporate, Asset type=Photo; for stock images Campaign/Product stay disabled via isStockImage
        setSourceInfo({
          business: "Corporate",
          campaign: "",
          campaignEnabled: false,
          product: "",
          productEnabled: false,
          assetType: "Photo",
        })
      }
    }
    if (isOpen && imageState.isBlurred) {
      setTransparentBg(false)
    }
  }, [isOpen, skipToDownload, imageState.isBlurred, imageState.originalFileName])

  // After a successful download, briefly show the checkmark state
  useEffect(() => {
    if (step === "downloading" && showDownloadSuccess) {
      const timer = setTimeout(() => {
        setStep("next-step")
        setShowDownloadSuccess(false)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [step, showDownloadSuccess])

  // Detect AI when entering metadata step 1
  useEffect(() => {
    if (isOpen && step === "metadata-step1" && !imageState.isAIGenerated && aiDetectionResult === null) {
      const detectAI = async () => {
        try {
          let imageUrlToSend = imageState.currentUrl
          if (imageState.currentUrl.startsWith("blob:")) {
            try {
              const response = await fetch(imageState.currentUrl)
              const blob = await response.blob()
              const reader = new FileReader()
              imageUrlToSend = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (typeof reader.result === "string") {
                    resolve(reader.result)
                  } else {
                    reject(new Error("Failed to convert blob to data URL"))
                  }
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            } catch (error) {
              console.error("Failed to prepare image for AI detection:", error)
              return
            }
          }

          if (!imageUrlToSend.startsWith("data:")) {
            try {
              const response = await fetch(imageUrlToSend)
              const blob = await response.blob()
              const reader = new FileReader()
              imageUrlToSend = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (typeof reader.result === "string") {
                    resolve(reader.result)
                  } else {
                    reject(new Error("Failed to convert to data URL"))
                  }
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            } catch (error) {
              console.error("Failed to prepare image for AI detection:", error)
              return
            }
          }

          const response = await fetch("/api/detect-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageDataUrl: imageUrlToSend }),
          })

          if (response.ok) {
            const result = await response.json()
            setAiDetectionResult({
              isAIGenerated: result.isAIGenerated,
              probability: result.probability,
            })
          } else {
            setAiDetectionResult({
              isAIGenerated: false,
              probability: 3,
            })
          }
        } catch (error) {
          console.error("AI detection error:", error)
          setAiDetectionResult({
            isAIGenerated: false,
            probability: 3,
          })
        }
      }

      detectAI()
    }
  }, [isOpen, step, imageState.isAIGenerated, imageState.currentUrl, aiDetectionResult])

  const previewFileName = useMemo(() => {
    return generateFileName(sourceInfo, imageState.originalFileName)
  }, [sourceInfo, imageState.originalFileName])

  const canGenerateMetadata = !!(sourceInfo.business && sourceInfo.assetType)

  const aiDisplayInfo = useMemo(() => {
    if (aiDetectionResult) {
      return {
        isAIGenerated: aiDetectionResult.isAIGenerated,
        probability: aiDetectionResult.probability,
      }
    }
    if (imageState.isAIGenerated) {
      return {
        isAIGenerated: true,
        probability: imageState.aiGeneratedProbability || 75,
      }
    }
    return {
      isAIGenerated: false,
      probability: imageState.aiGeneratedProbability || 3,
    }
  }, [aiDetectionResult, imageState.isAIGenerated, imageState.aiGeneratedProbability])

  const generateMetadata = async () => {
    if (!canGenerateMetadata) return

    setIsGenerating(true)
    try {
      let imageUrlToSend = imageState.currentUrl
      if (imageState.currentUrl.startsWith("blob:")) {
        try {
          const response = await fetch(imageState.currentUrl)
          const blob = await response.blob()
          const reader = new FileReader()
          imageUrlToSend = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result)
              } else {
                reject(new Error("Failed to convert blob to data URL"))
              }
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          throw new Error("Failed to process image. Please try again.")
        }
      }

      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageUrlToSend,
          sourceInformation: {
            business: sourceInfo.business,
            productCampaign: [sourceInfo.campaign, sourceInfo.product].filter(Boolean).join(", ") || "",
            assetType: sourceInfo.assetType,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate metadata" }))
        throw new Error(errorData.error || "Failed to generate metadata")
      }

      const result = await response.json()

      // File name comes from step 1 source info (previewFileName), not from AI image interpretation
      setMetadata({
        title: previewFileName,
        description: result.description || "",
        tags: result.tags || [],
      })

      setStep("metadata-step2")
    } catch (error) {
      console.error("Metadata generation error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate metadata. Please try again."
      alert(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const applyMetadata = async () => {
    setIsApplyingMetadata(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setMetadataApplied(true)
    setIsApplyingMetadata(false)
    setStep("download")
  }

  const handleUploadToMediaBank = async () => {
    setIsDownloading(true)
    try {
      let dataUrl: string
      let imageUrlToProcess = imageState.currentUrl

      if (imageState.isBlurred) {
        try {
          let imageDataUrl = imageState.currentUrl
          if (!imageDataUrl.startsWith("data:") && !imageDataUrl.startsWith("http")) {
            try {
              const response = await fetch(imageState.currentUrl)
              const blob = await response.blob()
              const reader = new FileReader()
              imageDataUrl = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (typeof reader.result === "string") {
                    resolve(reader.result)
                  } else {
                    reject(new Error("Failed to convert image to data URL"))
                  }
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            } catch (error) {
              console.error("Failed to prepare image for blur:", error)
              throw new Error("Failed to prepare image for blur. Please try again.")
            }
          }

          const blurResponse = await fetch("/api/blur", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: imageDataUrl, radius: 10 }),
          })

          if (!blurResponse.ok) {
            const errorData = await blurResponse.json().catch(() => ({
              error: "Failed to apply blur",
            }))
            throw new Error(errorData.error || "Failed to apply blur. Please try again.")
          }

          const blurResult = await blurResponse.json()
          imageUrlToProcess = blurResult.blurredImageUrl
        } catch (error) {
          console.error("Blur error:", error)
          throw new Error(error instanceof Error ? error.message : "Failed to apply blur. Please try again.")
        }
      }

      if (transparentBg && format === "PNG" && !imageState.isBlurred) {
        let imageDataUrl = imageState.currentUrl

        if (!imageDataUrl.startsWith("data:")) {
          try {
            const response = await fetch(imageState.currentUrl)
            const blob = await response.blob()
            const reader = new FileReader()
            imageDataUrl = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                if (typeof reader.result === "string") {
                  resolve(reader.result)
                } else {
                  reject(new Error("Failed to convert image to data URL"))
                }
              }
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          } catch (error) {
            console.error("Failed to prepare image for background removal:", error)
            throw new Error("Failed to prepare image for background removal. Please try again.")
          }
        }

        const removeBgResponse = await fetch("/api/remove-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl }),
        })

        if (!removeBgResponse.ok) {
          const errorData = await removeBgResponse.json().catch(() => ({
            error: "Failed to remove background",
          }))
          throw new Error(errorData.error || "Failed to remove background. Please try again.")
        }

        const resultBlob = await removeBgResponse.blob()
        dataUrl = URL.createObjectURL(resultBlob)
      } else {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas not supported")

        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imageUrlToProcess
        })

        canvas.width = img.width
        canvas.height = img.height

        if (transparentBg && format === "PNG") {
          ctx.drawImage(img, 0, 0)
        } else {
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
        }

        const mimeType = format === "PNG" ? "image/png" : "image/jpeg"
        dataUrl = canvas.toDataURL(mimeType, 0.95)
      }

      const blob = await (await fetch(dataUrl)).blob()
      const formData = new FormData()
      formData.append("file", blob, `${previewFileName || "image"}.${format.toLowerCase()}`)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to upload to Media Bank",
        }))
        throw new Error(errorData.error || "Failed to upload to Media Bank. Please try again.")
      }

      if (dataUrl.startsWith("blob:")) {
        URL.revokeObjectURL(dataUrl)
      }

      alert("Image uploaded to Media Bank successfully!")
      onClose()
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Upload failed. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    setShowDownloadSuccess(false)
    setStep("downloading")
    try {
      let dataUrl: string
      let imageUrlToProcess = imageState.currentUrl

      if (imageState.isBlurred) {
        try {
          let imageDataUrl = imageState.currentUrl
          if (!imageDataUrl.startsWith("data:") && !imageDataUrl.startsWith("http")) {
            try {
              const response = await fetch(imageState.currentUrl)
              const blob = await response.blob()
              const reader = new FileReader()
              imageDataUrl = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (typeof reader.result === "string") {
                    resolve(reader.result)
                  } else {
                    reject(new Error("Failed to convert image to data URL"))
                  }
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            } catch (error) {
              console.error("Failed to prepare image for blur:", error)
              throw new Error("Failed to prepare image for blur. Please try again.")
            }
          }

          const blurResponse = await fetch("/api/blur", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: imageDataUrl, radius: 10 }),
          })

          if (!blurResponse.ok) {
            const errorData = await blurResponse.json().catch(() => ({
              error: "Failed to apply blur",
            }))
            throw new Error(errorData.error || "Failed to apply blur. Please try again.")
          }

          const blurResult = await blurResponse.json()
          imageUrlToProcess = blurResult.blurredImageUrl
        } catch (error) {
          console.error("Blur error:", error)
          throw new Error(error instanceof Error ? error.message : "Failed to apply blur. Please try again.")
        }
      }

      if (transparentBg && format === "PNG" && !imageState.isBlurred) {
        let imageDataUrl = imageState.currentUrl

        if (!imageDataUrl.startsWith("data:")) {
          try {
            const response = await fetch(imageState.currentUrl)
            const blob = await response.blob()
            const reader = new FileReader()
            imageDataUrl = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                if (typeof reader.result === "string") {
                  resolve(reader.result)
                } else {
                  reject(new Error("Failed to convert image to data URL"))
                }
              }
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          } catch (error) {
            console.error("Failed to prepare image for background removal:", error)
            throw new Error("Failed to prepare image for background removal. Please try again.")
          }
        }

        const removeBgResponse = await fetch("/api/remove-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl }),
        })

        if (!removeBgResponse.ok) {
          const errorData = await removeBgResponse.json().catch(() => ({
            error: "Failed to remove background",
          }))
          throw new Error(errorData.error || "Failed to remove background. Please try again.")
        }

        const resultBlob = await removeBgResponse.blob()
        dataUrl = URL.createObjectURL(resultBlob)
      } else {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas not supported")

        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imageUrlToProcess
        })

        canvas.width = img.width
        canvas.height = img.height

        if (transparentBg && format === "PNG") {
          ctx.drawImage(img, 0, 0)
        } else {
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
        }

        const mimeType = format === "PNG" ? "image/png" : "image/jpeg"
        dataUrl = canvas.toDataURL(mimeType, 0.95)
      }

      if (metadataApplied && metadata.title) {
        const blob = await (await fetch(dataUrl)).blob()
        const formData = new FormData()
        formData.append("image", blob, `image.${format.toLowerCase()}`)
        formData.append("title", metadata.title)
        formData.append("description", metadata.description)
        const tagsToEmbed = imageState.isAIGenerated
          ? ["AI generated", ...metadata.tags.filter((t) => t !== "AI generated")]
          : metadata.tags
        formData.append("tags", tagsToEmbed.join(", "))
        formData.append("format", format)

        try {
          const response = await fetch("/api/embed-metadata", {
            method: "POST",
            body: formData,
          })

          if (response.ok) {
            const resultBlob = await response.blob()
            dataUrl = URL.createObjectURL(resultBlob)
          }
        } catch (err) {
          console.warn("Could not embed metadata, downloading without it")
        }
      }

      const filename = metadataApplied
        ? `${previewFileName}.${format.toLowerCase()}`
        : imageState.originalFileName?.replace(/\.[^/.]+$/, "") || `image.${format.toLowerCase()}`

      const finalFilename = filename.endsWith(`.${format.toLowerCase()}`) ? filename : `${filename}.${format.toLowerCase()}`

      const a = document.createElement("a")
      a.href = dataUrl
      a.download = finalFilename
      a.click()

      if (dataUrl.startsWith("blob:")) {
        URL.revokeObjectURL(dataUrl)
      }
      setShowDownloadSuccess(true)
    } catch (error) {
      console.error("Download error:", error)
      alert("Download failed. Please try again.")
      setStep("download")
      setShowDownloadSuccess(false)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  const isMetadataStep = step === "metadata-step1" || step === "metadata-step2"
  const isNextStep = step === "next-step"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-5 lg:p-6">
      <div 
        className={`bg-white flex flex-col w-full overflow-hidden ${
          isMetadataStep
            ? "max-w-[890px] lg:w-[890px] lg:h-[700px] max-h-[calc(100vh-32px)] sm:max-h-[calc(100vh-40px)] lg:max-h-[calc(100vh-64px)]"
            : isNextStep
              ? "max-w-[800px] lg:w-[800px] lg:h-[487px] max-h-[calc(100vh-32px)] sm:max-h-[calc(100vh-40px)] lg:max-h-[calc(100vh-64px)]"
              : "max-w-[800px] max-h-[calc(100vh-32px)] sm:max-h-[calc(100vh-40px)] lg:max-h-[calc(100vh-48px)]"
        }`}
        style={{
          borderRadius: '8px',
          boxShadow: '0 0 58.2px 0 rgba(0, 0, 0, 0.25)'
        }}
      >
        <div
          className="flex flex-col flex-1 min-h-0 overflow-auto"
          style={{
            paddingTop: isMetadataStep ? '0' : '56px',
            paddingRight: isMetadataStep ? '0' : '40px',
            paddingBottom: isMetadataStep ? '0' : '56px',
            paddingLeft: isMetadataStep ? '0' : '40px',
          }}
        >
        {step === "download" && (
          <DownloadStep
            format={format}
            onFormatChange={setFormat}
            transparentBg={transparentBg}
            onTransparentBgChange={setTransparentBg}
            imageState={imageState}
            metadataApplied={metadataApplied}
            previewFileName={previewFileName}
            isDownloading={isDownloading}
            onDownload={handleDownload}
            onUploadToMediaBank={handleUploadToMediaBank}
            onCancel={onClose}
            metadata={metadata}
            sourceInfo={sourceInfo}
          />
        )}

        {step === "metadata-step1" && (
          <MetadataStep1
            imageState={imageState}
            sourceInfo={sourceInfo}
            onSourceInfoChange={setSourceInfo}
            previewFileName={previewFileName}
            aiDisplayInfo={aiDisplayInfo}
            canGenerateMetadata={canGenerateMetadata}
            isGenerating={isGenerating}
            onGenerate={generateMetadata}
            onCancel={onClose}
            isStockImage={!!(imageState.originalFileName && isStockImage(imageState.originalFileName))}
          />
        )}

        {step === "metadata-step2" && (
          <MetadataStep2
            imageState={imageState}
            metadata={metadata}
            onMetadataChange={setMetadata}
            newTag={newTag}
            onNewTagChange={setNewTag}
            onAddTag={addTag}
            previewFileName={previewFileName}
            aiDisplayInfo={aiDisplayInfo}
            isApplyingMetadata={isApplyingMetadata}
            onApply={applyMetadata}
            onBack={() => setStep("metadata-step1")}
          />
        )}

        {step === "downloading" && (
          <>
            <h2 
              className="text-3xl font-bold mb-12 text-black"
              style={{ fontFamily: 'var(--font-abb-voice-display)' }}
            >
              EXPORT OPTIONS
            </h2>

            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <div className="text-sm text-gray-500">Downloading in progress..</div>
              {isDownloading && !showDownloadSuccess && (
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    padding: "4px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ABBLoader size={32} strokeWidth={2} speedMs={900} />
                </div>
              )}
              {!isDownloading && showDownloadSuccess && (
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: "56px",
                    height: "56px",
                    aspectRatio: "1 / 1",
                    borderRadius: "9999px",
                    border: "3px solid #E4E7FF",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 12.5L10 16.5L18 8.5"
                      stroke="#E4E7FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </>
        )}

        {step === "next-step" && (
          <>
            <h2 
              className="font-bold mb-12 text-black"
              style={{ 
                fontFamily: 'var(--font-abb-voice-display)',
                fontSize: '32px',
                lineHeight: '120%'
              }}
            >
              WHAT WOULD YOU LIKE TO DO NEXT?
            </h2>

            <div className="flex flex-col justify-between h-full gap-12">
              <p 
                className="text-base text-black"
                style={{
                  fontFamily: 'var(--font-abb-voice)',
                  fontSize: '16px',
                  lineHeight: '150%',
                  letterSpacing: '0px',
                  color: '#1F1F1F',
                  maxWidth: '720px'
                }}
              >
                Continue editing your current image, or go back to the start of the editor to upload a new one. Choosing to upload a new image will take you to the intro page.
              </p>

              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="abb-gradient-hover-pill transition-colors"
                  style={{
                    height: '48px',
                    borderRadius: '28px',
                    borderWidth: '2px',
                    borderColor: '#000000',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    fontSize: '16px',
                    fontWeight: 500,
                    backgroundColor: 'transparent',
                    color: '#000000'
                  }}
                >
                  Continue editing
                </Button>
                <Button
                  onClick={() => {
                    onClose()
                    window.location.href = '/'
                  }}
                  className="abb-red-button-gradient-hover text-white transition-none"
                  style={{
                    backgroundColor: '#FF000F',
                    height: '48px',
                    borderRadius: '28px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    fontSize: '16px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Upload new image
                </Button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
