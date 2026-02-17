"use client"

import { useState } from "react"
import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import DownloadModal from "./download-modal"
import MetadataPromptModal from "./metadata-prompt-modal"
import { CropIcon, AIIcon, BlurIcon } from "@/components/icons/abb-icons"
import type { ImageState, EditorMode } from "@/types/editor"

interface ControlsRowProps {
  canUndo: boolean
  canRedo: boolean
  isBlurred: boolean
  editorMode: EditorMode
  onUndo: () => void
  onRedo: () => void
  onBlur: () => void
  onModeChange: (mode: EditorMode) => void
  onCropApply: (croppedUrl: string, width: number, height: number) => void
  onAIEditApply: (editedUrl: string) => void
  imageState: ImageState
  hasCropPresetSelected?: boolean
  containerWidth?: number | null
  walkthroughActive?: boolean
}

export default function ControlsRow({
  canUndo,
  canRedo,
  isBlurred,
  editorMode,
  onUndo,
  onRedo,
  onBlur,
  onModeChange,
  imageState,
  hasCropPresetSelected = false,
  walkthroughActive = false,
}: ControlsRowProps) {
  const [showMetadataPrompt, setShowMetadataPrompt] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [skipMetadata, setSkipMetadata] = useState(false)

  const isCropMode = editorMode === "crop"
  const isAIEditMode = editorMode === "ai-edit" || editorMode === "ai-result"
  const isGuidedWalkthrough = walkthroughActive
  // When crop or AI edit panel is open, or guided walkthrough is active, hide tooltips so they don't overlap other UI
  const showMainTooltips = !isCropMode && !isAIEditMode && !isGuidedWalkthrough

  const showApplyCrop = isCropMode && hasCropPresetSelected

  const handleDownloadClick = () => {
    // If blur is the last operation, skip metadata prompt and go directly to download modal
    if (isBlurred) {
      setSkipMetadata(true)
      setShowDownloadModal(true)
    } else {
      setShowMetadataPrompt(true)
    }
  }

  const handleNoThanks = () => {
    setShowMetadataPrompt(false)
    setSkipMetadata(true)
    setShowDownloadModal(true)
  }

  const handleAddMetadata = () => {
    setShowMetadataPrompt(false)
    setSkipMetadata(false)
    setShowDownloadModal(true)
  }

  return (
    <>
      {/* Controls container: 24px gap above (image card → control row); extra space below */}
      <div
        data-editor-controls
        className={`flex justify-center px-4 sm:px-6 flex-shrink-0 pt-6 pb-8 ${walkthroughActive ? 'relative z-[57]' : ''}`}
      >
        <div className="w-full max-w-5xl flex justify-center">
          {/* Bottom Bar Component - Rectangular with rounded corners */}
          <div
            data-controls-bar
            className={`w-full flex items-center rounded-lg ${walkthroughActive ? '' : 'bg-[#F0F0F0]'}`}
            style={{
              height: "64px",
              padding: "8px 12px",
            }}
          >
            {/* Left Group: Undo/Redo */}
            <div className="flex items-center flex-1 justify-start min-w-0">
              <div
                data-tool-pill="undo-redo"
                className="flex items-center justify-center"
                style={walkthroughActive ? {
                  width: '115px',
                  height: '58px',
                  borderRadius: '36px',
                  background: '#FFFFFF',
                  gap: '2px',
                } : { gap: '2px' }}
              >
                {isGuidedWalkthrough ? (
                  <>
                    <Button
                      data-tool="undo"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-md text-[#000000] hover:bg-[#FFF] active:bg-gray-200 cursor-not-allowed transition-colors"
                    >
                      <Image src="/undo.svg" alt="Undo" width={18} height={18} className="w-[18px] h-[18px]" />
                    </Button>
                    <Button
                      data-tool="redo"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-md text-[#000000] hover:bg-[#FFF] active:bg-gray-200 cursor-not-allowed transition-colors"
                    >
                      <Image src="/redo.svg" alt="Redo" width={18} height={18} className="w-[18px] h-[18px]" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          data-tool="undo"
                          variant="ghost"
                          size="sm"
                          onClick={onUndo}
                          disabled={!canUndo}
                          className="h-9 w-9 p-0 rounded-md text-[#000000] hover:bg-[#FFF] active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Image src="/undo.svg" alt="Undo" width={18} height={18} className="w-[18px] h-[18px]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Undo</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          data-tool="redo"
                          variant="ghost"
                          size="sm"
                          onClick={onRedo}
                          disabled={!canRedo}
                          className="h-9 w-9 p-0 rounded-md text-[#000000] hover:bg-[#FFF] active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Image src="/redo.svg" alt="Redo" width={18} height={18} className="w-[18px] h-[18px]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Redo</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

            {/* Center Group: Main Tools */}
            <div className="flex items-center flex-shrink-0" style={{ gap: walkthroughActive ? '8px' : '4px' }}>
              {/* Crop pill */}
              <div
                data-tool-pill="crop"
                className="flex items-center justify-center"
                style={walkthroughActive ? {
                  width: '58px',
                  height: '58px',
                  borderRadius: '29px',
                  background: '#FFFFFF',
                } : undefined}
              >
                {showMainTooltips ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        data-tool="crop"
                        variant="ghost"
                        size="sm"
                        onClick={() => onModeChange(isCropMode ? "view" : "crop")}
                        className={`h-9 w-9 p-0 rounded-md transition-colors ${
                          isCropMode
                            ? "bg-[#6764F6] hover:bg-[#6764F6] active:bg-[#6764F6] text-white [&_svg]:text-white"
                            : "text-[#000000] hover:bg-[#FFF] active:bg-gray-200 [&_svg]:text-[#000000]"
                        }`}
                      >
                        <CropIcon className="w-[18px] h-[18px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Crop</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    data-tool="crop"
                    variant="ghost"
                    size="sm"
                    onClick={isGuidedWalkthrough ? undefined : () => onModeChange(isCropMode ? "view" : "crop")}
                    className={`h-9 w-9 p-0 rounded-md transition-colors ${
                      isCropMode
                        ? "bg-[#6764F6] hover:bg-[#6764F6] active:bg-[#6764F6] text-white [&_svg]:text-white"
                        : "text-[#000000] hover:bg-[#FFF] active:bg-gray-200 [&_svg]:text-[#000000]"
                    }`}
                  >
                    <CropIcon className="w-[18px] h-[18px]" />
                  </Button>
                )}
              </div>

              {/* AI Edit pill */}
              <div
                data-tool-pill="ai-edit"
                className="flex items-center justify-center"
                style={walkthroughActive ? {
                  width: '58px',
                  height: '58px',
                  borderRadius: '29px',
                  background: '#FFFFFF',
                } : undefined}
              >
                {showMainTooltips ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        data-tool="ai-edit"
                        variant="ghost"
                        size="sm"
                        onClick={() => onModeChange(isAIEditMode ? "view" : "ai-edit")}
                        className={`h-9 w-9 p-0 rounded-md transition-colors ${
                          isAIEditMode
                            ? "bg-[#6764F6] hover:bg-[#6764F6] active:bg-[#6764F6] text-white [&_svg]:text-white"
                            : "text-[#000000] hover:bg-[#FFF] active:bg-gray-200 [&_svg]:text-[#000000]"
                        }`}
                      >
                        <AIIcon className="w-[18px] h-[18px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Change scene</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    data-tool="ai-edit"
                    variant="ghost"
                    size="sm"
                    onClick={isGuidedWalkthrough ? undefined : () => onModeChange(isAIEditMode ? "view" : "ai-edit")}
                    className={`h-9 w-9 p-0 rounded-md transition-colors ${
                      isAIEditMode
                        ? "bg-[#6764F6] hover:bg-[#6764F6] active:bg-[#6764F6] text-white [&_svg]:text-white"
                        : "text-[#000000] hover:bg-[#FFF] active:bg-gray-200 [&_svg]:text-[#000000]"
                    }`}
                  >
                    <AIIcon className="w-[18px] h-[18px]" />
                  </Button>
                )}
              </div>

              {/* Blur pill */}
              <div
                data-tool-pill="blur"
                className="flex items-center justify-center"
                style={walkthroughActive ? {
                  width: '58px',
                  height: '58px',
                  borderRadius: '29px',
                  background: '#FFFFFF',
                } : undefined}
              >
                {showMainTooltips ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        data-tool="blur"
                        variant="ghost"
                        size="sm"
                        onClick={onBlur}
                        className={`h-9 w-9 p-0 rounded-md transition-colors ${
                          isBlurred
                            ? "bg-[#6764F6] hover:bg-[#6764F6] active:bg-[#6764F6] text-white [&_svg]:text-white"
                            : "text-[#000000] hover:bg-[#FFF] active:bg-gray-200 [&_svg]:text-[#000000]"
                        }`}
                      >
                        <BlurIcon className="w-[18px] h-[18px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Blur</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    data-tool="blur"
                    variant="ghost"
                    size="sm"
                    onClick={isGuidedWalkthrough ? undefined : onBlur}
                    className={`h-9 w-9 p-0 rounded-md transition-colors ${
                      isBlurred
                        ? "bg-[#6764F6] hover:bg-[#6764F6] active:bg-[#6764F6] text-white [&_svg]:text-white"
                        : "text-[#000000] hover:bg-[#FFF] active:bg-gray-200 [&_svg]:text-[#000000]"
                    }`}
                  >
                    <BlurIcon className="w-[18px] h-[18px]" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right Group: Export Options or Apply Crop */}
            <div className="flex items-center flex-1 justify-end min-w-0">
              {showApplyCrop ? (
                <Button
                  onClick={() => {
                    const event = new CustomEvent("applyCrop")
                    window.dispatchEvent(event)
                  }}
                  className="abb-red-button-gradient-hover bg-[#E30613] text-white rounded-full px-4 sm:px-5 h-12 text-sm font-semibold"
                >
                  Apply Crop
                </Button>
              ) : (
                <div
                  data-tool-pill="export"
                  className="flex items-center justify-center"
                  style={walkthroughActive ? {
                    height: '58px',
                    borderRadius: '36px',
                    background: '#FFFFFF',
                    paddingLeft: '5px',
                    paddingRight: '5px',
                  } : undefined}
                >
                  <button
                    data-tool="export"
                    onClick={isGuidedWalkthrough ? undefined : handleDownloadClick}
                    className="abb-gradient-hover-pill export-options-pill flex items-center gap-2"
                    style={{
                      height: '48px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      fontSize: '16px',
                      fontWeight: 500,
                    }}
                  >
                    <span className="text-[#000000]">Export options</span>
                    <Image
                      src="/export options.svg"
                      alt="Export options"
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Prompt Modal */}
      <MetadataPromptModal
        isOpen={showMetadataPrompt}
        onClose={() => setShowMetadataPrompt(false)}
        onNoThanks={handleNoThanks}
        onAddMetadata={handleAddMetadata}
        isBlurred={isBlurred}
      />

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        imageState={imageState}
        onClose={() => setShowDownloadModal(false)}
        skipToDownload={skipMetadata}
      />
    </>
  )
}
