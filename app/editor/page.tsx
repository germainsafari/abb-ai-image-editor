"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Header from "@/components/header"
import EditorCanvas, { CropHeaderInfo } from "@/components/editor/editor-canvas"
import ControlsRow from "@/components/editor/controls-row"
import UploadConfirmModal from "@/components/editor/upload-confirm-modal"
import { HowItWorksButton, HowItWorksOverlay } from "@/components/editor/how-it-works"
import type { ImageState, EditHistoryItem, EditorMode } from "@/types/editor"

// Notification types
type NotificationType = "color-correction" | "blur" | null

const NOTIFICATION_AUTO_DISMISS_MS = 6000

export default function EditorPage() {
  const searchParams = useSearchParams()
  const imageParam = searchParams.get("image")
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null)

  const [imageState, setImageState] = useState<ImageState | null>(null)
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Single notification state - only one notification visible at a time
  const [activeNotification, setActiveNotification] = useState<NotificationType>(null)
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Helper to show a notification (replaces any existing one)
  const showNotification = useCallback((type: NotificationType) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
      notificationTimeoutRef.current = null
    }
    
    // Set the new notification
    setActiveNotification(type)
    
    // Set auto-dismiss timeout
    if (type !== null) {
      notificationTimeoutRef.current = setTimeout(() => {
        setActiveNotification(null)
        notificationTimeoutRef.current = null
      }, NOTIFICATION_AUTO_DISMISS_MS)
    }
  }, [])

  const dismissNotification = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
      notificationTimeoutRef.current = null
    }
    setActiveNotification(null)
  }, [])

  const [editorMode, setEditorMode] = useState<EditorMode>("view")
  const [aiEditResult, setAiEditResult] = useState<{ beforeUrl: string; afterUrl: string } | null>(null)
  const [hasCropPresetSelected, setHasCropPresetSelected] = useState(false)
  const [cropHeaderInfo, setCropHeaderInfo] = useState<CropHeaderInfo>({ isActive: false })
  const [cropPopupVisible, setCropPopupVisible] = useState(true)

  const [showUploadConfirm, setShowUploadConfirm] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    }
  }, [])

  // Check for color correction banner flag
  useEffect(() => {
    if (typeof window !== "undefined") {
      const showBanner = window.localStorage.getItem("showColorCorrectionBanner")
      if (showBanner === "true") {
        showNotification("color-correction")
        window.localStorage.removeItem("showColorCorrectionBanner")
      }
    }
  }, [showNotification])

  // Resolve image URL either from query param or from localStorage
  useEffect(() => {
    const fromParam = imageParam
    if (fromParam) {
      setResolvedImageUrl(fromParam)
      return
    }

    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("lastUploadedImage")
      if (stored) {
        setResolvedImageUrl(stored)
      }
    }
  }, [imageParam])

  // Load image once we have a resolved URL
  useEffect(() => {
    if (!resolvedImageUrl) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const originalFileName =
        typeof window !== "undefined" ? window.localStorage.getItem("lastUploadedFileName") || undefined : undefined

      const newState: ImageState = {
        originalUrl: resolvedImageUrl,
        currentUrl: resolvedImageUrl,
        cropSourceUrl: resolvedImageUrl, // Initially same as original
        width: img.width,
        height: img.height,
        isBlurred: false,
        isAIGenerated: false,
        originalFileName,
      }
      setImageState(newState)
      setEditHistory([{ ...newState, timestamp: Date.now() }])
      setHistoryIndex(0)
    }
    img.onerror = () => {
      console.error("Failed to load image")
    }
    img.src = resolvedImageUrl
  }, [resolvedImageUrl])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setImageState(editHistory[newIndex])
    }
  }, [historyIndex, editHistory])

  const handleRedo = useCallback(() => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setImageState(editHistory[newIndex])
    }
  }, [historyIndex, editHistory])

  const addToHistory = useCallback(
    (newState: ImageState) => {
      const newHistory = editHistory.slice(0, historyIndex + 1)
      newHistory.push({ ...newState, timestamp: Date.now() })
      setEditHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      setImageState(newState)
    },
    [editHistory, historyIndex],
  )

  const handleBlur = useCallback(() => {
    if (!imageState) return

    // If we're in crop or AI edit mode, switch to view mode first
    if (editorMode === "crop" || editorMode === "ai-edit" || editorMode === "ai-result") {
      setEditorMode("view")
      setAiEditResult(null)
    }

    const newState = { ...imageState, isBlurred: !imageState.isBlurred }
    addToHistory(newState)
    if (!imageState.isBlurred) {
      showNotification("blur")
    }
  }, [imageState, addToHistory, editorMode, showNotification])

  const handleCropApply = useCallback(
    (croppedImageUrl: string, newWidth: number, newHeight: number) => {
      if (!imageState) return

      const newState: ImageState = {
        ...imageState,
        currentUrl: croppedImageUrl,
        width: newWidth,
        height: newHeight,
      }
      addToHistory(newState)
      setEditorMode("view")
    },
    [imageState, addToHistory],
  )

  const handleAIEditApply = useCallback(
    (editedImageUrl: string) => {
      if (!imageState) return

      const newState: ImageState = {
        ...imageState,
        currentUrl: editedImageUrl,
        cropSourceUrl: editedImageUrl, // AI result becomes the new base for cropping
        isAIGenerated: true,
      }
      addToHistory(newState)
      setEditorMode("view")
      setAiEditResult(null)
    },
    [imageState, addToHistory],
  )

  const handleModeChange = useCallback((mode: EditorMode) => {
    // If switching to crop or AI edit mode and blur is active, disable blur first
    if ((mode === "crop" || mode === "ai-edit") && imageState?.isBlurred) {
      const newState = { ...imageState, isBlurred: false }
      addToHistory(newState)
    }

    setEditorMode(mode)
    if (mode !== "ai-result") {
      setAiEditResult(null)
    }
    // When leaving crop mode, show popup again next time user enters crop
    if (mode === "view") {
      setCropPopupVisible(true)
    }
  }, [imageState, addToHistory])

  const hasAnyBanner = activeNotification !== null

  const hasActiveCropHeader = editorMode === "crop" && cropHeaderInfo.isActive

  if (!imageState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading image...</div>
      </div>
    )
  }

  // Determine which pixel dimensions to display:
  // - While actively cropping with a preset/custom ratio, show the live crop box pixels
  // - Otherwise, show the current image dimensions
  const pixelWidth =
    hasActiveCropHeader && cropHeaderInfo.widthPx && cropHeaderInfo.heightPx
      ? cropHeaderInfo.widthPx
      : imageState.width
  const pixelHeight =
    hasActiveCropHeader && cropHeaderInfo.widthPx && cropHeaderInfo.heightPx
      ? cropHeaderInfo.heightPx
      : imageState.height

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden relative" style={{ minHeight: '500px' }}>
      <Header
        showUploadButton
        onUploadNewImage={() => setShowUploadConfirm(true)}
        walkthroughActive={showHowItWorks}
      />

      {/* Banner / crop-header: fixed min-height so image card stays stable when banner appears/disappears. */}
      <div className="flex-shrink-0 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mt-1 mb-1 min-h-[58px] flex flex-col gap-2">
            {/* Single notification banner - only one visible at a time */}
            {activeNotification !== null && (
              <div 
                className="bg-[#EBF1FF] flex items-center shadow-sm animate-slide-down"
                style={{
                  borderRadius: '8px',
                  padding: '16px 24px',
                  height: '58px',
                  gap: '16px',
                }}
              >
                {/* Info icon - 16x16 */}
                <div className="flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="#0F0F0F">
                    <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8.99976 8V12C8.99976 12.5523 8.55204 13 7.99976 13C7.44747 13 6.99976 12.5523 6.99976 12V8C6.99976 7.44772 7.44747 7 7.99976 7C8.55204 7 8.99976 7.44772 8.99976 8ZM9.25037 4.25195C9.25037 4.94231 8.69072 5.50195 8.00037 5.50195C7.31001 5.50195 6.75037 4.94231 6.75037 4.25195C6.75037 3.5616 7.31001 3.00195 8.00037 3.00195C8.69072 3.00195 9.25037 3.5616 9.25037 4.25195Z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700 flex-1">
                  {activeNotification === "color-correction" 
                    ? "Your image has been automatically color corrected."
                    : "Your image has been automatically blurred."}
                </p>
                {/* Close button - 16x16 icon */}
                <button
                  onClick={dismissNotification}
                  className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
                  style={{ padding: '0' }}
                  aria-label="Dismiss notification"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4L12 12M4 12L12 4" />
                  </svg>
                </button>
              </div>
            )}

            {/* Header row for crop context + pixel size.
                This row is always rendered when no banner is visible so that
                the pixel size is consistently visible across editor states. */}
            {!hasAnyBanner && (
              <div className="bg-background rounded-xl px-0 sm:px-2 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-h-[24px]">
                  {hasActiveCropHeader && (
                    <>
                      <button
                        onClick={() =>
                          cropPopupVisible ? handleModeChange("view") : setCropPopupVisible(true)
                        }
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={cropPopupVisible ? "Exit crop" : "Show crop options"}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium">
                        {cropHeaderInfo.isCustom
                          ? "Custom resolution:"
                          : `${cropHeaderInfo.categoryLabel ?? ""} format:`}
                        {cropHeaderInfo.selectedPresetLabel && cropHeaderInfo.selectedPresetDisplayRatio && (
                          <span className="text-[#6764F6] font-medium ml-1">
                            {cropHeaderInfo.selectedPresetLabel} ({cropHeaderInfo.selectedPresetDisplayRatio})
                          </span>
                        )}
                        {cropHeaderInfo.isCustom &&
                          cropHeaderInfo.customRatioWidth &&
                          cropHeaderInfo.customRatioHeight && (
                            <span className="text-[#6764F6] font-medium ml-1">
                              {cropHeaderInfo.customRatioWidth}:{cropHeaderInfo.customRatioHeight}
                            </span>
                          )}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {pixelWidth} x {pixelHeight} px
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content area - takes full remaining height */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <EditorCanvas
          imageState={imageState}
          editorMode={editorMode}
          aiEditResult={aiEditResult}
          onCropApply={handleCropApply}
          onAIEditApply={handleAIEditApply}
          onAIEditResult={setAiEditResult}
          onModeChange={handleModeChange}
          onCropPresetChange={setHasCropPresetSelected}
          onCropHeaderChange={setCropHeaderInfo}
          cropPopupVisible={cropPopupVisible}
          onCropPopupVisibleChange={setCropPopupVisible}
        />

        {/* Controls Row + How It Works button on same horizontal level */}
        <div className="relative flex-shrink-0">
          <ControlsRow
            canUndo={historyIndex > 0}
            canRedo={historyIndex < editHistory.length - 1}
            isBlurred={imageState.isBlurred}
            editorMode={editorMode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onBlur={handleBlur}
            onModeChange={handleModeChange}
            onCropApply={handleCropApply}
            onAIEditApply={handleAIEditApply}
            imageState={imageState}
            hasCropPresetSelected={hasCropPresetSelected}
            walkthroughActive={showHowItWorks}
          />
          {/* How it works button - same horizontal level as control panel */}
          <div
            className={`absolute ${showHowItWorks ? 'z-[59]' : 'z-[56]'}`}
            style={{
              top: '24px',
              right: '24px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <HowItWorksButton
              isActive={showHowItWorks}
              onToggle={() => setShowHowItWorks((prev) => !prev)}
            />
          </div>
        </div>
        {/* Spacer: on large monitors extra space goes below the control panel */}
        <div className="flex-1 min-h-0 flex-shrink-0" aria-hidden="true" />
      </main>

      {/* How it works overlay */}
      {showHowItWorks && (
        <HowItWorksOverlay onClose={() => setShowHowItWorks(false)} />
      )}

      {/* Upload confirm modal */}
      <UploadConfirmModal
        isOpen={showUploadConfirm}
        onClose={() => setShowUploadConfirm(false)}
        onConfirm={() => {
          setShowUploadConfirm(false)
          window.location.href = '/'
        }}
      />
    </div>
  )
}
