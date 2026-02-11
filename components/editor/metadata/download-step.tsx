"use client"

import { DownloadIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ImageState } from "@/types/editor"

interface DownloadStepProps {
  format: "PNG" | "JPG"
  onFormatChange: (format: "PNG" | "JPG") => void
  transparentBg: boolean
  onTransparentBgChange: (transparent: boolean) => void
  imageState: ImageState
  metadataApplied: boolean
  previewFileName: string
  isDownloading: boolean
  onDownload: () => void
  onUploadToMediaBank: () => void
  onCancel: () => void
}

export default function DownloadStep({
  format,
  onFormatChange,
  transparentBg,
  onTransparentBgChange,
  imageState,
  metadataApplied,
  previewFileName,
  isDownloading,
  onDownload,
  onUploadToMediaBank,
  onCancel,
}: DownloadStepProps) {
  const imageSize = `${imageState.width} x ${imageState.height} px`

  return (
    <>
      <h2 
        className="text-2xl font-bold mb-12 text-black"
        style={{ fontFamily: 'var(--font-abb-voice-display)' }}
      >
        EXPORT OPTIONS
      </h2>

      <div className="flex flex-col gap-12">
        {/* Format selection */}
        <div className="flex flex-col gap-3">
          <label
            className="text-sm"
            style={{
              color: 'var(--Grey---90, #1F1F1F)',
              fontFamily: 'var(--font-abb-voice-medium)',
              fontSize: 'var(--Typography-Size-Body-x-small, 14px)',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '21px',
              letterSpacing: 'var(--Typography-Letter-Spacing-Body-x-small, 0)',
            }}
          >
            Choose file type
          </label>
          <div className="flex flex-col gap-2">
            {(["PNG", "JPG"] as const).map((fmt) => (
              <label
                key={fmt}
                className="flex items-start cursor-pointer"
                style={{ 
                  minHeight: '24px',
                  gap: 'var(--Spacing-Component-xxx-small, 8px)',
                }}
              >
                <div className="relative">
                  <input
                    type="radio"
                    name="format"
                    checked={format === fmt}
                    onChange={() => onFormatChange(fmt)}
                    className="sr-only"
                  />
                  <div
                    className="flex items-center justify-center rounded-full bg-white transition-all"
                    style={{
                      width: 24,
                      height: 24,
                      border: '1px solid black',
                    }}
                  >
                    {format === fmt && (
                      <div
                        className="rounded-full"
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: '#615EEF',
                        }}
                      />
                    )}
                  </div>
                </div>
                <span
                  className="text-sm"
                  style={{
                    color: 'var(--Colour-Shades-Grey-grey-90, #1F1F1F)',
                    fontFamily: 'var(--font-abb-voice)',
                    fontSize: 'var(--Typography-Size-Label-medium, 14px)',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: 'var(--Typography-Line-Height-Label-medium, 21px)',
                    letterSpacing: 'var(--Typography-Letter-Spacing-Label-small, 0.12px)',
                  }}
                >
                  {fmt}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Transparent background */}
        <label 
          className={`flex items-center gap-3 ${format === "JPG" || imageState.isBlurred ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <input
            type="checkbox"
            checked={transparentBg}
            onChange={(e) => onTransparentBgChange(e.target.checked)}
            disabled={format === "JPG" || imageState.isBlurred}
            className="w-4 h-4 rounded border-gray-300 accent-[#E30613] disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-500">Transparent background</span>
        </label>

        {/* Info row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div
              className="text-xs mb-1"
              style={{
                color: 'var(--Grey---90, #1F1F1F)',
                fontFamily: 'var(--font-abb-voice-medium)',
                fontSize: 'var(--Typography-Size-Body-x-small, 14px)',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '21px',
                letterSpacing: 'var(--Typography-Letter-Spacing-Body-x-small, 0)',
              }}
            >
              Image size
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="text-sm font-medium text-gray-500">
                {imageSize}
              </span>
            </div>
          </div>
          <div>
            <div
              className="text-xs mb-1"
              style={{
                color: 'var(--Grey---90, #1F1F1F)',
                fontFamily: 'var(--font-abb-voice-medium)',
                fontSize: 'var(--Typography-Size-Body-x-small, 14px)',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '21px',
                letterSpacing: 'var(--Typography-Letter-Spacing-Body-x-small, 0)',
              }}
            >
              Metadata
            </div>
            <div className="text-sm font-medium text-gray-500">{metadataApplied ? "Added" : "Not added"}</div>
          </div>
          <div>
            <div
              className="text-xs mb-1"
              style={{
                color: 'var(--Grey---90, #1F1F1F)',
                fontFamily: 'var(--font-abb-voice-medium)',
                fontSize: 'var(--Typography-Size-Body-x-small, 14px)',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '21px',
                letterSpacing: 'var(--Typography-Letter-Spacing-Body-x-small, 0)',
              }}
            >
              File name preview:
            </div>
            <div className="text-sm font-medium text-gray-500 truncate">
              {metadataApplied 
                ? `${previewFileName}.${format.toLowerCase()}` 
                : imageState.originalFileName 
                  ? `${imageState.originalFileName.replace(/\.[^/.]+$/, "")}.${format.toLowerCase()}`
                  : `image.${format.toLowerCase()}`
              }
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onCancel}
            className="abb-gradient-hover-pill"
            style={{
              height: '48px',
              paddingLeft: '24px',
              paddingRight: '24px',
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            <span className="text-[#000000]">Cancel</span>
          </button>
          <div className="flex gap-3">
            <Button
              onClick={onDownload}
              disabled={isDownloading}
              className="abb-red-button-gradient-hover text-white disabled:opacity-50"
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
                gap: '8px'
              }}
            >
              Download
              <DownloadIcon className="w-5 h-5" />
            </Button>
            <Button
              onClick={onUploadToMediaBank}
              disabled={isDownloading}
              className="abb-red-button-gradient-hover text-white disabled:opacity-50"
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
                gap: '8px'
              }}
            >
              Upload to Media Bank
              <ExternalLink className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

