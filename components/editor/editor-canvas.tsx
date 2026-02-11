"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft } from "lucide-react"
import { CheckIcon, RetryIcon } from "@/components/icons/abb-icons"
import type { ImageState, EditorMode, CropDimensions } from "@/types/editor"
import CropPresetTray from "@/components/editor/crop-preset-tray"
import { CROP_CATEGORIES, type CategoryPreset } from "@/lib/crop-presets"
import AILoadingPopup from "@/components/editor/ai-loading-popup"
import { useViewportSize, calculateEditorMaxHeight } from "@/hooks/use-viewport-size"

export interface CropHeaderInfo {
  isActive: boolean
  isCustom?: boolean
  categoryLabel?: string
  selectedPresetLabel?: string
  selectedPresetDisplayRatio?: string
  customRatioWidth?: string
  customRatioHeight?: string
  widthPx?: number
  heightPx?: number
}

interface EditorCanvasProps {
  imageState: ImageState
  editorMode: EditorMode
  aiEditResult: { beforeUrl: string; afterUrl: string } | null
  onCropApply: (croppedImageUrl: string, newWidth: number, newHeight: number) => void
  onAIEditApply: (editedImageUrl: string) => void
  onAIEditResult: (result: { beforeUrl: string; afterUrl: string } | null) => void
  onModeChange: (mode: EditorMode) => void
  onCropPresetChange?: (hasPreset: boolean) => void
  onCropHeaderChange?: (info: CropHeaderInfo) => void
  cropPopupVisible?: boolean
  onCropPopupVisibleChange?: (visible: boolean) => void
}

export default function EditorCanvas({
  imageState,
  editorMode,
  aiEditResult,
  onCropApply,
  onAIEditApply,
  onAIEditResult,
  onModeChange,
  onCropPresetChange,
  onCropHeaderChange,
  cropPopupVisible = true,
  onCropPopupVisibleChange,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Crop state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<CategoryPreset | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [customRatioWidth, setCustomRatioWidth] = useState<string>("")
  const [customRatioHeight, setCustomRatioHeight] = useState<string>("")
  const [cropDims, setCropDims] = useState<CropDimensions>({ x: 0, y: 0, width: 100, height: 100 })
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 })
  const [displayedDims, setDisplayedDims] = useState({ width: 0, height: 0 })
  const [cropInitialized, setCropInitialized] = useState(false)
  const [originalImageDims, setOriginalImageDims] = useState({ width: 0, height: 0 })

  // AI Edit state
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiPresetKey, setAiPresetKey] = useState<string | null>(null)

  const AI_PRESETS = [
    { key: "remove-bg", label: "Remove background" },
    { key: "add-object", label: "Add object" },
    { key: "change-bg", label: "Change background" },
  ] as const
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Blur animation state
  const [isBlurAnimating, setIsBlurAnimating] = useState(false)
  const prevBlurredRef = useRef(false)
  
  // Viewport-aware sizing
  const viewport = useViewportSize()
  const dynamicMaxHeight = useMemo(() => 
    calculateEditorMaxHeight(viewport.height, viewport.isShortScreen, viewport.isVeryShortScreen),
    [viewport.height, viewport.isShortScreen, viewport.isVeryShortScreen]
  )

  // Bottom offset for popups (crop tray / AI edit) so they don't cover the controls bar.
  // Falls back to the current hard-coded behavior (104px) if the controls element can't be found.
  const [popupBottomOffset, setPopupBottomOffset] = useState(104)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Prioritize the actual control bar element over the wrapper
    const controlsSelectors = [
      "[data-controls-bar]",
      "[data-editor-controls]",
      "#editor-controls",
      ".editor-controls",
    ]

    let controlsResizeObserver: ResizeObserver | null = null
    let cleanupScroll: (() => void) | null = null
    let cancelled = false

    const findControlsEl = () =>
      controlsSelectors
        .map((s) => document.querySelector<HTMLElement>(s))
        .find((el): el is HTMLElement => Boolean(el)) || null

    const attachControls = (controlsEl: HTMLElement) => {
      const update = () => {
        if (cancelled) return
        const rect = controlsEl.getBoundingClientRect()
        const fromBottom = Math.max(0, window.innerHeight - rect.top)
        if (Number.isFinite(fromBottom) && fromBottom >= 60) {
          setPopupBottomOffset(fromBottom)
        } else {
          setPopupBottomOffset(104)
        }
      }
      update()
      controlsResizeObserver = new ResizeObserver(update)
      controlsResizeObserver.observe(controlsEl)
    }

    let controlsAttached = false
    const tryAttach = (attempt = 0) => {
      if (cancelled) return
      const controlsEl = findControlsEl()
      if (controlsEl && !controlsAttached) {
        attachControls(controlsEl)
        controlsAttached = true
      }
      if (!controlsEl) {
        if (attempt < 10) setTimeout(() => tryAttach(attempt + 1), 150)
      }
    }

    tryAttach()

    const onResize = () => {
      if (cancelled) return
      const controlsEl = findControlsEl()
      if (controlsEl) {
        const rect = controlsEl.getBoundingClientRect()
        const fromBottom = Math.max(0, window.innerHeight - rect.top)
        if (Number.isFinite(fromBottom) && fromBottom >= 60) setPopupBottomOffset(fromBottom)
        else setPopupBottomOffset(104)
      }
    }
    const onScroll = () => onResize()
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onScroll, true)
    cleanupScroll = () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onScroll, true)
    }

    return () => {
      cancelled = true
      controlsResizeObserver?.disconnect()
      cleanupScroll?.()
    }
  }, [])

  // Popup bottom: position 12px above the control bar
  // The 24px gap between image card and controls is split evenly:
  // - 12px above the control bar (popup bottom)
  // - 12px past the image card boundary (popup extends into the image)
  const popupBottomPx = popupBottomOffset + 12

  // Get current category (fallback to first for safety)
  const currentCategory =
    (selectedCategory && CROP_CATEGORIES.find((cat) => cat.name === selectedCategory)) || CROP_CATEGORIES[0]

  // Determine if crop rectangle should be shown
  const showCropOverlay = editorMode === "crop" && cropInitialized && (selectedPreset !== null || isCustom)

  // Load crop source image dimensions when imageState changes (for crop calculations)
  // cropSourceUrl is the full base image (original or latest AI result)
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setOriginalImageDims({ width: img.width, height: img.height })
    }
    // Use cropSourceUrl to get dimensions of the full base image for cropping
    img.src = imageState.cropSourceUrl
  }, [imageState.cropSourceUrl])

  // Helper to calculate actual displayed image bounds (accounting for object-contain)
  const getDisplayedImageBounds = useCallback(() => {
    if (!imageRef.current) return { x: 0, y: 0, width: 0, height: 0 }
    
    const rect = imageRef.current.getBoundingClientRect()
    const img = imageRef.current
    
    // Use the displayed image's natural dimensions for accurate crop calculations
    // In crop mode, we display currentUrl (which may be AI-edited or previously cropped)
    let naturalWidth: number
    let naturalHeight: number
    
    if (editorMode === "crop" && img.naturalWidth > 0 && img.naturalHeight > 0) {
      // In crop mode, use the displayed image's natural dimensions
      naturalWidth = img.naturalWidth
      naturalHeight = img.naturalHeight
    } else {
      // Use stored current image dimensions, or natural dimensions, or fallback to current state
      naturalWidth = originalImageDims.width || img.naturalWidth || imageState.width
      naturalHeight = originalImageDims.height || img.naturalHeight || imageState.height
    }
    
    // Calculate actual displayed image dimensions (accounting for object-contain)
    const containerAspect = rect.width / rect.height
    const imageAspect = naturalWidth / naturalHeight
    
    let displayedWidth: number
    let displayedHeight: number
    let offsetX = 0
    let offsetY = 0
    
    if (imageAspect > containerAspect) {
      // Image is wider - fit to width
      displayedWidth = rect.width
      displayedHeight = rect.width / imageAspect
      offsetY = (rect.height - displayedHeight) / 2
    } else {
      // Image is taller - fit to height
      displayedHeight = rect.height
      displayedWidth = rect.height * imageAspect
      offsetX = (rect.width - displayedWidth) / 2
    }
    
    return { x: offsetX, y: offsetY, width: displayedWidth, height: displayedHeight }
  }, [originalImageDims, imageState.width, imageState.height, editorMode])

  const getActiveAspectRatio = useCallback(() => {
    if (!isCustom && selectedPreset?.ratio) {
      return selectedPreset.ratio
    }

    const w = parseFloat(customRatioWidth)
    const h = parseFloat(customRatioHeight)
    if (isCustom && !Number.isNaN(w) && !Number.isNaN(h) && w > 0 && h > 0) {
      return w / h
    }

    // Fallback to image ratio or sensible default
    if (imageState.width && imageState.height) {
      return imageState.width / imageState.height
    }
    return 16 / 9
  }, [isCustom, selectedPreset, customRatioWidth, customRatioHeight, imageState.width, imageState.height])


  const recenterCropForRatio = useCallback((ratio: number) => {
    if (!imageRef.current) return

    const imageBounds = getDisplayedImageBounds()

    // Calculate maximum crop size that fits within image with the exact aspect ratio
    let maxCropW = imageBounds.width
    let maxCropH = maxCropW / ratio
    if (maxCropH > imageBounds.height) {
      maxCropH = imageBounds.height
      maxCropW = maxCropH * ratio
    }

    // Start at 80% of max size, centered
    let cropW = maxCropW * 0.8
    let cropH = cropW / ratio

    // Center the crop box
    const cropX = imageBounds.x + (imageBounds.width - cropW) / 2
    const cropY = imageBounds.y + (imageBounds.height - cropH) / 2

    setCropDims({ x: cropX, y: cropY, width: cropW, height: cropH })
    setCropInitialized(true)
  }, [getDisplayedImageBounds])

  // Reset crop state when exiting crop mode
  useEffect(() => {
    if (editorMode !== "crop") {
      setSelectedCategory(null)
      setSelectedPreset(null)
      setIsCustom(false)
      setCustomRatioWidth("")
      setCustomRatioHeight("")
      setCropInitialized(false)
    }
  }, [editorMode])

  // Trigger blur animation when blur is activated
  useEffect(() => {
    if (imageState.isBlurred && !prevBlurredRef.current) {
      // Blur was just activated - trigger animation
      setIsBlurAnimating(true)
      const timer = setTimeout(() => {
        setIsBlurAnimating(false)
      }, 1000) // Animation duration
      return () => clearTimeout(timer)
    }
    prevBlurredRef.current = imageState.isBlurred
  }, [imageState.isBlurred])

  // Notify parent when crop preset selection changes
  useEffect(() => {
    const hasPreset = selectedPreset !== null || isCustom
    onCropPresetChange?.(hasPreset && cropInitialized)
  }, [selectedPreset, isCustom, cropInitialized, onCropPresetChange])

  // Notify parent with crop header info so it can be rendered
  // in the shared banner/header region above the image card.
  useEffect(() => {
    if (!onCropHeaderChange) return

    // Header should only be active while in crop mode AND while a preset
    // (or custom ratio) is actively selected. This matches the requirement
    // that category labels are only visible during active crop preset use.
    const hasActivePresetOrCustom = !!selectedPreset || isCustom
    if (editorMode !== "crop" || !selectedCategory || !hasActivePresetOrCustom) {
      onCropHeaderChange({ isActive: false })
      return
    }

    const hasDisplayedDims = displayedDims.width > 0 && displayedDims.height > 0

    onCropHeaderChange({
      isActive: true,
      isCustom,
      categoryLabel: currentCategory.label,
      selectedPresetLabel: selectedPreset?.label,
      selectedPresetDisplayRatio: selectedPreset?.displayRatio,
      customRatioWidth,
      customRatioHeight,
      widthPx: hasDisplayedDims ? displayedDims.width : undefined,
      heightPx: hasDisplayedDims ? displayedDims.height : undefined,
    })
  }, [
    editorMode,
    isCustom,
    selectedCategory,
    selectedPreset,
    currentCategory.label,
    customRatioWidth,
    customRatioHeight,
    displayedDims.width,
    displayedDims.height,
    onCropHeaderChange,
  ])

  // Calculate displayed dimensions when crop is active
  useEffect(() => {
    if (editorMode === "crop" && imageRef.current && cropInitialized) {
      const imageBounds = getDisplayedImageBounds()
      
      // Load crop source image to get its dimensions for accurate scaling
      // cropSourceUrl is the full base image (original or latest AI result)
      const sourceImg = new Image()
      sourceImg.crossOrigin = "anonymous"
      sourceImg.onload = () => {
        const scaleX = sourceImg.width / imageBounds.width
        const scaleY = sourceImg.height / imageBounds.height

        setDisplayedDims({
          width: Math.round(cropDims.width * scaleX),
          height: Math.round(cropDims.height * scaleY),
        })
      }
      sourceImg.src = imageState.cropSourceUrl
    }
  }, [cropDims, editorMode, imageState.cropSourceUrl, cropInitialized, getDisplayedImageBounds])

  // Listen for apply crop event from controls row
  useEffect(() => {
    const handleApplyCrop = () => {
      if (editorMode === "crop" && cropInitialized) {
        handleApplyCropInternal()
      }
    }
    window.addEventListener("applyCrop", handleApplyCrop)
    return () => window.removeEventListener("applyCrop", handleApplyCrop)
  }, [editorMode, cropDims, imageState.currentUrl, imageState.width, imageState.height, cropInitialized])

  const handlePresetSelect = useCallback((preset: CategoryPreset) => {
    setSelectedPreset(preset)
    setIsCustom(false)
    recenterCropForRatio(preset.ratio)
  }, [recenterCropForRatio])

  const handleCategorySelect = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName)
    if (categoryName === "custom") {
      setIsCustom(true)
      setSelectedPreset(null)
      // Initialize crop with image's natural ratio for custom mode
      if (imageRef.current) {
        const ratio = imageState.width / imageState.height
        recenterCropForRatio(ratio)
      }
    } else {
      // Don't auto-select preset - wait for user to click one
      setIsCustom(false)
      setSelectedPreset(null)
      setCustomRatioWidth("")
      setCustomRatioHeight("")
      setCropInitialized(false)
    }
  }, [recenterCropForRatio, imageState.width, imageState.height])

  // Update crop when custom ratio changes
  useEffect(() => {
    if (isCustom && customRatioWidth && customRatioHeight) {
      const w = parseFloat(customRatioWidth)
      const h = parseFloat(customRatioHeight)
      if (!Number.isNaN(w) && !Number.isNaN(h) && w > 0 && h > 0) {
        recenterCropForRatio(w / h)
      }
    }
  }, [isCustom, customRatioWidth, customRatioHeight, recenterCropForRatio])

  // Drag handlers for crop
  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(handle)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: cropDims.x,
      cropY: cropDims.y,
      cropW: cropDims.width,
      cropH: cropDims.height,
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !imageRef.current) return

      const imageBounds = getDisplayedImageBounds()
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      const minSize = 50

      // Image boundary limits
      const imgLeft = imageBounds.x
      const imgRight = imageBounds.x + imageBounds.width
      const imgTop = imageBounds.y
      const imgBottom = imageBounds.y + imageBounds.height

      // Get the locked aspect ratio (MUST be locked when preset/custom is selected)
      let lockedAspectRatio: number | null = null
      if (!isCustom && selectedPreset?.ratio) {
        lockedAspectRatio = selectedPreset.ratio
      } else if (isCustom && customRatioWidth && customRatioHeight) {
        const w = parseFloat(customRatioWidth)
        const h = parseFloat(customRatioHeight)
        if (!Number.isNaN(w) && !Number.isNaN(h) && w > 0 && h > 0) {
          lockedAspectRatio = w / h
        }
      }

      let newX = dragStart.cropX
      let newY = dragStart.cropY
      let newW = dragStart.cropW
      let newH = dragStart.cropH

      if (isDragging === "move") {
        // Move the crop box - clamp position to keep fully within bounds
        newX = dragStart.cropX + deltaX
        newY = dragStart.cropY + deltaY
        
        // Clamp to image bounds
        newX = Math.max(imgLeft, Math.min(newX, imgRight - newW))
        newY = Math.max(imgTop, Math.min(newY, imgBottom - newH))
      } else {
        // For resize operations, calculate limits FIRST, then apply resize within those limits
        // This prevents the crop box from "trying" to grow beyond bounds
        
        // Calculate the anchor point (the edge/corner that stays fixed)
        const anchorRight = dragStart.cropX + dragStart.cropW
        const anchorBottom = dragStart.cropY + dragStart.cropH
        const anchorLeft = dragStart.cropX
        const anchorTop = dragStart.cropY

        if (isDragging === "se") {
          // Southeast corner - top-left is anchor, bottom-right moves
          // Max size is limited by distance from anchor to image edges
          const maxW = imgRight - anchorLeft
          const maxH = imgBottom - anchorTop
          
          // Calculate desired size
          let desiredW = dragStart.cropW + deltaX
          let desiredH = dragStart.cropH + deltaY
          
          if (lockedAspectRatio !== null) {
            // Use the more significant movement direction
            const scaleX = desiredW / dragStart.cropW
            const scaleY = desiredH / dragStart.cropH
            const scale = Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY
            desiredW = dragStart.cropW * scale
            desiredH = desiredW / lockedAspectRatio
            
            // Clamp to max while maintaining aspect ratio
            if (desiredW > maxW) {
              desiredW = maxW
              desiredH = desiredW / lockedAspectRatio
            }
            if (desiredH > maxH) {
              desiredH = maxH
              desiredW = desiredH * lockedAspectRatio
            }
          } else {
            desiredW = Math.min(desiredW, maxW)
            desiredH = Math.min(desiredH, maxH)
          }
          
          newW = Math.max(minSize, desiredW)
          newH = lockedAspectRatio ? newW / lockedAspectRatio : Math.max(minSize, desiredH)
          newX = anchorLeft
          newY = anchorTop
          
        } else if (isDragging === "sw") {
          // Southwest corner - top-right is anchor, bottom-left moves
          const maxW = anchorRight - imgLeft
          const maxH = imgBottom - anchorTop
          
          let desiredW = dragStart.cropW - deltaX
          let desiredH = dragStart.cropH + deltaY
          
          if (lockedAspectRatio !== null) {
            const scaleX = desiredW / dragStart.cropW
            const scaleY = desiredH / dragStart.cropH
            const scale = Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY
            desiredW = dragStart.cropW * scale
            desiredH = desiredW / lockedAspectRatio
            
            if (desiredW > maxW) {
              desiredW = maxW
              desiredH = desiredW / lockedAspectRatio
            }
            if (desiredH > maxH) {
              desiredH = maxH
              desiredW = desiredH * lockedAspectRatio
            }
          } else {
            desiredW = Math.min(desiredW, maxW)
            desiredH = Math.min(desiredH, maxH)
          }
          
          newW = Math.max(minSize, desiredW)
          newH = lockedAspectRatio ? newW / lockedAspectRatio : Math.max(minSize, desiredH)
          newX = anchorRight - newW
          newY = anchorTop
          
        } else if (isDragging === "ne") {
          // Northeast corner - bottom-left is anchor, top-right moves
          const maxW = imgRight - anchorLeft
          const maxH = anchorBottom - imgTop
          
          let desiredW = dragStart.cropW + deltaX
          let desiredH = dragStart.cropH - deltaY
          
          if (lockedAspectRatio !== null) {
            const scaleX = desiredW / dragStart.cropW
            const scaleY = desiredH / dragStart.cropH
            const scale = Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY
            desiredW = dragStart.cropW * scale
            desiredH = desiredW / lockedAspectRatio
            
            if (desiredW > maxW) {
              desiredW = maxW
              desiredH = desiredW / lockedAspectRatio
            }
            if (desiredH > maxH) {
              desiredH = maxH
              desiredW = desiredH * lockedAspectRatio
            }
          } else {
            desiredW = Math.min(desiredW, maxW)
            desiredH = Math.min(desiredH, maxH)
          }
          
          newW = Math.max(minSize, desiredW)
          newH = lockedAspectRatio ? newW / lockedAspectRatio : Math.max(minSize, desiredH)
          newX = anchorLeft
          newY = anchorBottom - newH
          
        } else if (isDragging === "nw") {
          // Northwest corner - bottom-right is anchor, top-left moves
          const maxW = anchorRight - imgLeft
          const maxH = anchorBottom - imgTop
          
          let desiredW = dragStart.cropW - deltaX
          let desiredH = dragStart.cropH - deltaY
          
          if (lockedAspectRatio !== null) {
            const scaleX = desiredW / dragStart.cropW
            const scaleY = desiredH / dragStart.cropH
            const scale = Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY
            desiredW = dragStart.cropW * scale
            desiredH = desiredW / lockedAspectRatio
            
            if (desiredW > maxW) {
              desiredW = maxW
              desiredH = desiredW / lockedAspectRatio
            }
            if (desiredH > maxH) {
              desiredH = maxH
              desiredW = desiredH * lockedAspectRatio
            }
          } else {
            desiredW = Math.min(desiredW, maxW)
            desiredH = Math.min(desiredH, maxH)
          }
          
          newW = Math.max(minSize, desiredW)
          newH = lockedAspectRatio ? newW / lockedAspectRatio : Math.max(minSize, desiredH)
          newX = anchorRight - newW
          newY = anchorBottom - newH
          
        } else if (isDragging === "e") {
          // East edge - left edge is anchor, right edge moves
          const maxW = imgRight - anchorLeft
          let desiredW = dragStart.cropW + deltaX
          
          if (lockedAspectRatio !== null) {
            // When aspect ratio is locked, height changes too (centered vertically)
            const maxH = Math.min(anchorTop - imgTop + dragStart.cropH / 2, imgBottom - anchorTop - dragStart.cropH / 2) * 2 + dragStart.cropH
            desiredW = Math.min(desiredW, maxW)
            let desiredH = desiredW / lockedAspectRatio
            
            // Also limit by available vertical space
            const centerY = anchorTop + dragStart.cropH / 2
            const maxHByTop = (centerY - imgTop) * 2
            const maxHByBottom = (imgBottom - centerY) * 2
            const actualMaxH = Math.min(maxHByTop, maxHByBottom)
            
            if (desiredH > actualMaxH) {
              desiredH = actualMaxH
              desiredW = desiredH * lockedAspectRatio
            }
            
            newW = Math.max(minSize, desiredW)
            newH = newW / lockedAspectRatio
            newX = anchorLeft
            newY = centerY - newH / 2
          } else {
            newW = Math.max(minSize, Math.min(desiredW, maxW))
            newX = anchorLeft
          }
          
        } else if (isDragging === "w") {
          // West edge - right edge is anchor, left edge moves
          const maxW = anchorRight - imgLeft
          let desiredW = dragStart.cropW - deltaX
          
          if (lockedAspectRatio !== null) {
            desiredW = Math.min(desiredW, maxW)
            let desiredH = desiredW / lockedAspectRatio
            
            const centerY = anchorTop + dragStart.cropH / 2
            const maxHByTop = (centerY - imgTop) * 2
            const maxHByBottom = (imgBottom - centerY) * 2
            const actualMaxH = Math.min(maxHByTop, maxHByBottom)
            
            if (desiredH > actualMaxH) {
              desiredH = actualMaxH
              desiredW = desiredH * lockedAspectRatio
            }
            
            newW = Math.max(minSize, desiredW)
            newH = newW / lockedAspectRatio
            newX = anchorRight - newW
            newY = centerY - newH / 2
          } else {
            newW = Math.max(minSize, Math.min(desiredW, maxW))
            newX = anchorRight - newW
          }
          
        } else if (isDragging === "s") {
          // South edge - top edge is anchor, bottom edge moves
          const maxH = imgBottom - anchorTop
          let desiredH = dragStart.cropH + deltaY
          
          if (lockedAspectRatio !== null) {
            desiredH = Math.min(desiredH, maxH)
            let desiredW = desiredH * lockedAspectRatio
            
            const centerX = anchorLeft + dragStart.cropW / 2
            const maxWByLeft = (centerX - imgLeft) * 2
            const maxWByRight = (imgRight - centerX) * 2
            const actualMaxW = Math.min(maxWByLeft, maxWByRight)
            
            if (desiredW > actualMaxW) {
              desiredW = actualMaxW
              desiredH = desiredW / lockedAspectRatio
            }
            
            newH = Math.max(minSize, desiredH)
            newW = newH * lockedAspectRatio
            newX = centerX - newW / 2
            newY = anchorTop
          } else {
            newH = Math.max(minSize, Math.min(desiredH, maxH))
            newY = anchorTop
          }
          
        } else if (isDragging === "n") {
          // North edge - bottom edge is anchor, top edge moves
          const maxH = anchorBottom - imgTop
          let desiredH = dragStart.cropH - deltaY
          
          if (lockedAspectRatio !== null) {
            desiredH = Math.min(desiredH, maxH)
            let desiredW = desiredH * lockedAspectRatio
            
            const centerX = anchorLeft + dragStart.cropW / 2
            const maxWByLeft = (centerX - imgLeft) * 2
            const maxWByRight = (imgRight - centerX) * 2
            const actualMaxW = Math.min(maxWByLeft, maxWByRight)
            
            if (desiredW > actualMaxW) {
              desiredW = actualMaxW
              desiredH = desiredW / lockedAspectRatio
            }
            
            newH = Math.max(minSize, desiredH)
            newW = newH * lockedAspectRatio
            newX = centerX - newW / 2
            newY = anchorBottom - newH
          } else {
            newH = Math.max(minSize, Math.min(desiredH, maxH))
            newY = anchorBottom - newH
          }
        }
        
        // Final safety clamp - ensure crop box is fully within image bounds
        // This catches any edge cases
        newX = Math.max(imgLeft, Math.min(newX, imgRight - newW))
        newY = Math.max(imgTop, Math.min(newY, imgBottom - newH))
        
        // If width/height exceed bounds after position clamp, shrink while maintaining aspect ratio
        if (newX + newW > imgRight) {
          newW = imgRight - newX
          if (lockedAspectRatio) newH = newW / lockedAspectRatio
        }
        if (newY + newH > imgBottom) {
          newH = imgBottom - newY
          if (lockedAspectRatio) newW = newH * lockedAspectRatio
        }
      }

      setCropDims({ x: newX, y: newY, width: newW, height: newH })
    },
    [isDragging, dragStart, selectedPreset, isCustom, customRatioWidth, customRatioHeight, getDisplayedImageBounds],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Apply crop
  const handleApplyCropInternal = () => {
    if (!imageRef.current) return

    // Use cropSourceUrl for cropping (the full base image - original or latest AI result)
    // This ensures the user always crops from the full image, not a previously cropped version
    const sourceImg = new Image()
    sourceImg.crossOrigin = "anonymous"
    
    sourceImg.onload = () => {
      // Get the displayed image element's bounding rect
      const rect = imageRef.current!.getBoundingClientRect()
      
      // Calculate actual displayed image dimensions (accounting for object-contain)
      // The image might be smaller than the container due to aspect ratio
      const containerAspect = rect.width / rect.height
      const imageAspect = sourceImg.width / sourceImg.height
      
      let displayedWidth: number
      let displayedHeight: number
      let offsetX = 0
      let offsetY = 0
      
      if (imageAspect > containerAspect) {
        // Image is wider - fit to width
        displayedWidth = rect.width
        displayedHeight = rect.width / imageAspect
        offsetY = (rect.height - displayedHeight) / 2
      } else {
        // Image is taller - fit to height
        displayedHeight = rect.height
        displayedWidth = rect.height * imageAspect
        offsetX = (rect.width - displayedWidth) / 2
      }
      
      // Calculate scale factors from displayed size to source size
      const scaleX = sourceImg.width / displayedWidth
      const scaleY = sourceImg.height / displayedHeight
      
      // Adjust crop dimensions to account for image offset within container
      const adjustedX = cropDims.x - offsetX
      const adjustedY = cropDims.y - offsetY
      
      // Ensure crop is within actual image bounds
      const clampedX = Math.max(0, Math.min(adjustedX, displayedWidth))
      const clampedY = Math.max(0, Math.min(adjustedY, displayedHeight))
      const clampedW = Math.max(0, Math.min(cropDims.width, displayedWidth - clampedX))
      const clampedH = Math.max(0, Math.min(cropDims.height, displayedHeight - clampedY))
      
      // Convert to source image coordinates
      const actualX = clampedX * scaleX
      const actualY = clampedY * scaleY
      const actualW = clampedW * scaleX
      const actualH = clampedH * scaleY
      
      // Ensure we don't exceed source image bounds
      const finalX = Math.max(0, Math.min(actualX, sourceImg.width))
      const finalY = Math.max(0, Math.min(actualY, sourceImg.height))
      const finalW = Math.max(0, Math.min(actualW, sourceImg.width - finalX))
      const finalH = Math.max(0, Math.min(actualH, sourceImg.height - finalY))

      const canvas = document.createElement("canvas")
      canvas.width = finalW
      canvas.height = finalH
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(sourceImg, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH)
      const croppedUrl = canvas.toDataURL("image/jpeg", 0.95)
      onCropApply(croppedUrl, Math.round(finalW), Math.round(finalH))
    }
    
    // Use cropSourceUrl to crop from the full base image (original or latest AI result)
    sourceImg.src = imageState.cropSourceUrl
  }

  // AI Edit handlers
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return

    setIsGenerating(true)
    setAiError(null)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      // Special-case handling for true background removal using remove.bg
      if (aiPresetKey === "remove-bg") {
        // Ensure we have a data URL for the current image, similar to download/export flow
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
            throw new Error("Failed to prepare image for background removal. Please try again.")
          }
        }

        const removeBgResponse = await fetch("/api/remove-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl }),
          signal: abortControllerRef.current.signal,
        })

        if (!removeBgResponse.ok) {
          const errorData = await removeBgResponse.json().catch(() => ({
            error: "Failed to remove background",
          }))
          throw new Error(errorData.error || "Failed to remove background. Please try again.")
        }

        const resultBlob = await removeBgResponse.blob()
        const resultUrl = URL.createObjectURL(resultBlob)

        onAIEditResult({
          beforeUrl: imageState.currentUrl,
          afterUrl: resultUrl,
        })
        onModeChange("ai-result")
      } else {
        const presetsToSend = aiPresetKey ? [aiPresetKey] : []

        const response = await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: imageState.currentUrl,
            prompt: aiPrompt,
            presets: presetsToSend,
            // Pass original dimensions to preserve aspect ratio
            width: imageState.width,
            height: imageState.height,
          }),
          signal: abortControllerRef.current.signal,
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle specific error cases
          if (data.error?.includes("credits") || data.error?.includes("quota")) {
            throw new Error("Insufficient credits. Please upgrade your plan or try again later.")
          }
          throw new Error(data.error || "Generation failed")
        }

        onAIEditResult({
          beforeUrl: imageState.currentUrl,
          afterUrl: data.editedImageUrl,
        })
        onModeChange("ai-result")
      }
    } catch (error: unknown) {
      // Don't show error if it was aborted
      if (error instanceof Error && error.name === "AbortError") {
        return
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to generate. Please try again."
      setAiError(errorMessage)
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsGenerating(false)
    setAiError(null)
  }

  const handlePresetClick = (presetKey: string, presetLabel: string) => {
    setAiPresetKey(presetKey)
    setAiPrompt(presetLabel)
  }

  return (
    <div className="relative flex flex-col overflow-hidden min-h-0">
      {/* Canvas container: no flex-1 so it only takes content height; image sits just below banner, 24px above control row on all devices */}
      <div
        ref={containerRef}
        data-editor-image-card
        className={`flex items-start justify-center px-4 pt-0 pb-0 sm:px-6 lg:px-8 min-h-0 ${
          editorMode === "ai-result" ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
        }`}
      >
        {/* AI Result Split View */}
        {editorMode === "ai-result" && aiEditResult && (
          <div className="w-full flex flex-col items-center pb-32">
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="flex flex-col items-center">
                <span className="text-sm text-[#7C3AED] font-medium mb-2">Before</span>
                <div className="rounded-lg overflow-hidden border border-border shadow-md">
                  <img
                    src={aiEditResult.beforeUrl || "/placeholder.svg"}
                    alt="Before"
                    className="w-full h-auto object-contain transition-[max-height] duration-200"
                    style={{ maxHeight: `calc(${dynamicMaxHeight} * 0.7)` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm text-[#7C3AED] font-medium mb-2">After</span>
                <div className="rounded-lg overflow-hidden border-2 border-[#7C3AED] shadow-md bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]">
                  <img
                    src={aiEditResult.afterUrl || "/placeholder.svg"}
                    alt="After"
                    className="w-full h-auto object-contain transition-[max-height] duration-200"
                    style={{ maxHeight: `calc(${dynamicMaxHeight} * 0.7)` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Normal view, crop mode, or AI edit mode */}
        {(editorMode === "view" || editorMode === "crop" || editorMode === "ai-edit") && (
          <div className="relative w-full max-w-5xl flex flex-col items-center">
            {/* Image card container - this is the stable anchor point */}
            <div className="relative w-full">
              {/* Image card - stable container that never moves */}
              <div className="relative w-full overflow-hidden bg-muted/40">
                <div className="relative w-full flex items-center justify-center overflow-hidden">
                  {/* Image - in crop mode, show the full base image (cropSourceUrl); otherwise show currentUrl */}
                  <img
                    ref={imageRef}
                    src={editorMode === "crop" ? imageState.cropSourceUrl : (imageState.currentUrl || "/placeholder.svg")}
                    alt="Editor canvas"
                    className="w-full h-auto object-contain relative z-0 block transition-[max-height] duration-200"
                    style={{ maxHeight: dynamicMaxHeight }}
                    crossOrigin="anonymous"
                  />
                  
                  {/* Uniform blur overlay - single layer for consistent blur across entire image */}
                  {imageState.isBlurred && (
                    <>
                      {/* Full uniform blur layer */}
                      <div
                        className={`absolute top-0 left-0 w-full h-full z-10 block overflow-hidden ${
                          isBlurAnimating ? "blur-progressive-animation" : ""
                        }`}
                      >
                        <img
                          src={editorMode === "crop" ? imageState.cropSourceUrl : (imageState.currentUrl || "/placeholder.svg")}
                          alt="Blurred image"
                          className="w-full h-full object-contain"
                          style={{
                            filter: 'blur(16px)',
                            transform: 'scale(1.12)',
                          }}
                          crossOrigin="anonymous"
                        />
                      </div>

                      {/* Soft vertical ABB Lilac transition ridge at blur boundary */}
                      <div
                        className={`absolute top-0 left-0 w-full h-full pointer-events-none ${
                          isBlurAnimating ? "blur-ridge-animation" : ""
                        }`}
                        style={{
                          zIndex: 11,
                        }}
                      >
                        <div
                          className="blur-ridge-gradient"
                          style={{
                            width: '64px',
                            height: '100%',
                            background: `linear-gradient(to right, 
                              rgba(248, 245, 255, 0) 0px,
                              rgba(248, 245, 255, 0.15) 12px,
                              rgba(248, 245, 255, 0.30) 18px,
                              rgba(248, 245, 255, 0.50) 22px,
                              rgba(248, 245, 255, 0.65) 26px,
                              rgba(248, 245, 255, 0.75) 29px,
                              rgba(248, 245, 255, 0.82) 31px,
                              rgba(248, 245, 255, 0.88) 32px,
                              rgba(248, 245, 255, 0.82) 33px,
                              rgba(248, 245, 255, 0.75) 35px,
                              rgba(248, 245, 255, 0.65) 38px,
                              rgba(248, 245, 255, 0.50) 42px,
                              rgba(248, 245, 255, 0.30) 46px,
                              rgba(248, 245, 255, 0.15) 52px,
                              rgba(248, 245, 255, 0) 64px
                            )`,
                            mixBlendMode: 'screen',
                            filter: 'blur(0.5px)',
                            position: 'absolute',
                            left: isBlurAnimating ? '0%' : '100%',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Crop overlay - only show after a preset is selected */}
                {showCropOverlay && imageRef.current && (
                  <>
                    {/* Dimmed area outside crop */}
                    <div className="absolute inset-0 pointer-events-none z-20">
                      <div className="absolute inset-0 bg-black/40" />
                      <div
                        className="absolute bg-transparent"
                        style={{
                          left: cropDims.x,
                          top: cropDims.y,
                          width: cropDims.width,
                          height: cropDims.height,
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                          borderRadius: "0.75rem",
                        }}
                      />
                    </div>

                    {/* Crop rectangle with rounded corners & subtle handles */}
                    <div
                      className="absolute border border-white/90 rounded-xl cursor-move z-30"
                      style={{
                        left: cropDims.x,
                        top: cropDims.y,
                        width: cropDims.width,
                        height: cropDims.height,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, "move")}
                    >
                      {/* Corner handles */}
                      <div
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-sm shadow cursor-nwse-resize"
                        onMouseDown={(e) => handleMouseDown(e, "nw")}
                      />
                      <div
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-sm shadow cursor-nesw-resize"
                        onMouseDown={(e) => handleMouseDown(e, "ne")}
                      />
                      <div
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-sm shadow cursor-nesw-resize"
                        onMouseDown={(e) => handleMouseDown(e, "sw")}
                      />
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white rounded-sm shadow cursor-nwse-resize"
                        onMouseDown={(e) => handleMouseDown(e, "se")}
                      />
                      {/* Edge handles */}
                      <div
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white rounded-full shadow cursor-ns-resize"
                        onMouseDown={(e) => handleMouseDown(e, "n")}
                      />
                      <div
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white rounded-full shadow cursor-ns-resize"
                        onMouseDown={(e) => handleMouseDown(e, "s")}
                      />
                      <div
                        className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-1.5 h-8 bg-white rounded-full shadow cursor-ew-resize"
                        onMouseDown={(e) => handleMouseDown(e, "w")}
                      />
                      <div
                        className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-1.5 h-8 bg-white rounded-full shadow cursor-ew-resize"
                        onMouseDown={(e) => handleMouseDown(e, "e")}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Edit input panel – portaled so it sits above the controls bar; shadow: 0 0 58.2px 0 rgba(0,0,0,0.1) */}
      {editorMode === "ai-edit" &&
        !isGenerating &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 flex justify-center"
            style={{
              bottom: `calc(${popupBottomPx}px + env(safe-area-inset-bottom, 0px))`,
              zIndex: 9999,
            }}
          >
            <div className="w-full max-w-[664px] px-4 pointer-events-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ease-out">
              <div
                className="bg-white rounded-lg py-5 px-6"
                style={{ boxShadow: "0 0 58.2px 0 rgba(0, 0, 0, 0.1)" }}
              >
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => {
                    setAiPrompt(e.target.value)
                    setAiPresetKey(null)
                  }}
                  placeholder="Describe what you would like to change..."
                  className="w-full p-3 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                  disabled={isGenerating}
                />

                <div className="flex items-center justify-between mt-4">
                  <div className="flex flex-wrap gap-2">
                    {AI_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => handlePresetClick(preset.key, preset.label)}
                        className={`abb-ai-prompt-chip rounded-2xl border transition-colors flex items-center ${
                          aiPrompt === preset.label
                            ? "abb-ai-prompt-chip--selected bg-[#6764F6] border-[#6764F6]"
                            : "bg-white border-gray-300 hover:bg-[#E4E7FF] hover:text-[#1F1F1F] hover:border-[#E4E7FF]"
                        }`}
                        style={{ paddingTop: "9px", paddingBottom: "9px", paddingLeft: "8px", paddingRight: "8px" }}
                        disabled={isGenerating}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || isGenerating}
                    className="abb-red-button-gradient-hover h-10 px-4 bg-[#EE0000] text-white rounded-full text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isGenerating ? "Generating..." : "Generate"}
                  </button>
                </div>

                {aiError && <div className="mt-3 p-2 bg-red-50 text-red-600 text-sm rounded-lg">{aiError}</div>}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* AI Loading Popup – portaled so it sits above the controls bar; shadow: 0 0 58.2px 0 rgba(0,0,0,0.1) */}
      {editorMode === "ai-edit" &&
        isGenerating &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-x-0 flex justify-center"
            style={{
              bottom: `calc(${popupBottomPx}px + env(safe-area-inset-bottom, 0px))`,
              zIndex: 9999,
            }}
          >
            <AILoadingPopup onCancel={handleCancelGeneration} />
          </div>,
          document.body
        )}

      {/* Crop format tray – rendered in a portal so it sits above the controls bar and
          is never clipped. Fixed positioning and overlay shadow make it clearly visible. */}
      {editorMode === "crop" &&
        !isDragging &&
        cropPopupVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 flex justify-center"
            style={{
              bottom: `calc(${popupBottomPx}px + env(safe-area-inset-bottom, 0px))`,
              zIndex: 9999,
            }}
          >
            <div className="w-full max-w-3xl px-4 pointer-events-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ease-out">
              <div
                className="rounded-2xl border border-border bg-white abb-popup-overlay-shadow"
                style={{
                  maxHeight: `calc(100vh - (${popupBottomPx}px + 16px))`,
                  overflowY: "auto",
                }}
              >
                <CropPresetTray
                  categories={CROP_CATEGORIES}
                  selectedCategory={selectedCategory}
                  selectedPreset={selectedPreset}
                  customRatioWidth={customRatioWidth}
                  customRatioHeight={customRatioHeight}
                  currentCategoryLabel={currentCategory.label}
                  onSelectCategory={handleCategorySelect}
                  onSelectPreset={handlePresetSelect}
                  onChangeCustomWidth={setCustomRatioWidth}
                  onChangeCustomHeight={setCustomRatioHeight}
                  onHidePopup={onCropPopupVisibleChange ? () => onCropPopupVisibleChange(false) : undefined}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Done! How do you like it? – portaled so it sits above the controls bar; always visible */}
      {editorMode === "ai-result" &&
        aiEditResult &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 flex justify-center"
            style={{
              bottom: `calc(${popupBottomPx}px + env(safe-area-inset-bottom, 0px))`,
              zIndex: 9999,
            }}
          >
            <div className="w-full max-w-[664px] px-4 pointer-events-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ease-out">
              <div
                className="bg-white rounded-lg flex items-center justify-between"
                style={{
                  height: '88px',
                  padding: '20px 24px',
                  boxShadow: '0 0 58.2px 0 rgba(0, 0, 0, 0.1)',
                  fontFamily: 'var(--font-abb-voice)',
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckIcon className="flex-shrink-0" />
                  <span
                    className="text-sm"
                    style={{ fontWeight: 400 }}
                  >
                    Done! How do you like it?
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onAIEditResult(null)
                      onModeChange("ai-edit")
                    }}
                    className="abb-gradient-hover-pill flex items-center gap-2"
                    style={{
                      fontFamily: 'var(--font-abb-voice)',
                      fontWeight: 500,
                      fontSize: '12px',
                      lineHeight: '100%',
                      height: '48px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                    }}
                  >
                    <span className="text-[#000000]">Retry</span> <RetryIcon className="w-4 h-4 text-[#000000]" />
                  </button>
                  <button
                    onClick={() => onAIEditApply(aiEditResult.afterUrl)}
                    className="abb-red-button-gradient-hover px-4 bg-[#E30613] text-white rounded-full"
                    style={{
                      fontFamily: 'var(--font-abb-voice)',
                      fontWeight: 500,
                      fontSize: '12px',
                      lineHeight: '100%',
                      height: '48px',
                      borderRadius: '28px',
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
