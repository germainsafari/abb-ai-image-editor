"use client"

import { DownloadIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ImageState } from "@/types/editor"

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
  metadata?: MetadataResult
  sourceInfo?: SourceInfo
}

const labelStyle: React.CSSProperties = {
  color: 'var(--Grey---90, #1F1F1F)',
  fontFamily: 'var(--font-abb-voice)',
  fontSize: '14px',
  fontStyle: 'normal',
  fontWeight: 500,
  lineHeight: '21px',
  letterSpacing: '0',
}

const valueStyle: React.CSSProperties = {
  color: '#6B6B6B',
  fontFamily: 'var(--font-abb-voice)',
  fontSize: '14px',
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: '21px',
  letterSpacing: '0',
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
  metadata,
  sourceInfo,
}: DownloadStepProps) {
  const imageSize = `${imageState.width} x ${imageState.height} px`
  const showMetadataColumn = metadataApplied && metadata && sourceInfo

  const fileName = metadataApplied
    ? `${previewFileName}.${format.toLowerCase()}`
    : imageState.originalFileName
      ? `${imageState.originalFileName.replace(/\.[^/.]+$/, "")}.${format.toLowerCase()}`
      : `image.${format.toLowerCase()}`

  return (
    <div className="flex flex-col" style={{ gap: '40px' }}>
      {/* Title */}
      <h2
        className="text-black"
        style={{
          fontFamily: 'var(--font-abb-voice-display)',
          fontSize: '32px',
          fontWeight: 700,
          lineHeight: '120%',
        }}
      >
        EXPORT OPTIONS
      </h2>

      {/* Content area */}
      <div
        className={`flex ${showMetadataColumn ? 'flex-col md:flex-row' : 'flex-col'}`}
        style={{ gap: showMetadataColumn ? '40px' : '24px' }}
      >
        {/* Left column */}
        <div
          className="flex flex-col shrink-0"
          style={{
            gap: '24px',
            ...(showMetadataColumn ? { width: '220px' } : {}),
          }}
        >
          {/* Format selection */}
          <div className="flex flex-col" style={{ gap: '12px' }}>
            <span style={labelStyle}>Choose file type</span>
            <div className="flex flex-col" style={{ gap: '8px' }}>
              {(["PNG", "JPG"] as const).map((fmt) => (
                <label
                  key={fmt}
                  className="flex items-center cursor-pointer"
                  style={{ gap: '8px', minHeight: '24px' }}
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
                  <span style={valueStyle}>{fmt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Transparent background */}
          <label
            className={`flex items-center ${format === "JPG" || imageState.isBlurred ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            style={{ gap: '8px' }}
          >
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => onTransparentBgChange(e.target.checked)}
                disabled={format === "JPG" || imageState.isBlurred}
                className="sr-only"
              />
              <div
                className="flex items-center justify-center transition-all"
                style={{
                  width: 24,
                  height: 24,
                  border: 'var(--Border-Size-x-small, 1px) solid #000',
                  background: transparentBg
                    ? 'var(--Colour-Secondary-abb-lilac-100, #615EEF)'
                    : 'var(--Colour-Backgrounds-Light-white-100, #FFF)',
                }}
              >
                {transparentBg && (
                  <svg width="16.25" height="11.25" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.43842 10.1489C1.68621 9.90956 2.0819 9.9156 2.32222 10.1624L6.78048 14.7415L16.4332 5.18109C16.678 4.93866 17.0737 4.93978 17.3171 5.18361C17.5605 5.42743 17.5594 5.82162 17.3146 6.06406L7.21309 16.0689C7.09458 16.1863 6.93383 16.2515 6.76672 16.25C6.59961 16.2485 6.44007 16.1804 6.32373 16.0609L1.42488 11.0293C1.18457 10.7825 1.19063 10.3883 1.43842 10.1489Z" fill="#FFFFFF"/>
                  </svg>
                )}
              </div>
            </div>
            <span style={{ ...valueStyle, color: '#858585' }}>
              Transparent background
            </span>
          </label>

          {/* Image size */}
          <div>
            <div style={{ ...labelStyle, marginBottom: '4px' }}>Image size</div>
            <div style={valueStyle}>{imageSize}</div>
          </div>

          {/* Metadata status */}
          <div>
            <div style={{ ...labelStyle, marginBottom: '4px' }}>Metadata</div>
            <div className="flex items-center" style={{ gap: '6px' }}>
              {metadataApplied && (
                <img
                  src="/added icon.svg"
                  alt=""
                  style={{ width: '16.25px', height: '11.25px' }}
                />
              )}
              <span style={valueStyle}>
                {metadataApplied ? "Added" : "Not added"}
              </span>
            </div>
          </div>
        </div>

        {/* Right column (only when metadata is applied) */}
        {showMetadataColumn && (
          <>
            {/* Right column - metadata details */}
            <div
              className="flex-1 flex flex-col min-w-0"
              style={{ gap: '16px' }}
            >
              {/* File name */}
              <div>
                <div style={{ ...labelStyle, marginBottom: '4px' }}>File name:</div>
                <div style={valueStyle}>{fileName}</div>
              </div>

              {/* Description */}
              <div>
                <div style={{ ...labelStyle, marginBottom: '4px' }}>Description</div>
                <div style={valueStyle}>{metadata.description || '—'}</div>
              </div>

              {/* Tags */}
              <div>
                <div style={{ ...labelStyle, marginBottom: '4px' }}>Tags</div>
                <div style={valueStyle}>
                  {metadata.tags.length > 0 ? metadata.tags.join(', ') : '—'}
                </div>
              </div>

              {/* Division + Asset type row */}
              <div className="flex" style={{ gap: '40px' }}>
                <div style={{ minWidth: '120px' }}>
                  <div style={{ ...labelStyle, marginBottom: '4px' }}>Division</div>
                  <div style={valueStyle}>{sourceInfo.business || '—'}</div>
                </div>
                <div>
                  <div style={{ ...labelStyle, marginBottom: '4px' }}>Asset type</div>
                  <div style={valueStyle}>{sourceInfo.assetType || '—'}</div>
                </div>
              </div>

              {/* Campaign name */}
              {sourceInfo.campaignEnabled && sourceInfo.campaign && (
                <div>
                  <div style={{ ...labelStyle, marginBottom: '4px' }}>Campaign name</div>
                  <div style={valueStyle}>{sourceInfo.campaign}</div>
                </div>
              )}

              {/* Product name */}
              {sourceInfo.productEnabled && sourceInfo.product && (
                <div>
                  <div style={{ ...labelStyle, marginBottom: '4px' }}>Product name</div>
                  <div style={valueStyle}>{sourceInfo.product}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* File name preview (when no metadata) */}
        {!showMetadataColumn && (
          <div>
            <div style={{ ...labelStyle, marginBottom: '4px' }}>File name preview:</div>
            <div style={valueStyle}>{fileName}</div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between" style={{ gap: '12px' }}>
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
        <div className="flex flex-wrap" style={{ gap: '12px' }}>
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
              gap: '8px',
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
              gap: '8px',
            }}
          >
            Upload to Media Bank
            <ExternalLink className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
