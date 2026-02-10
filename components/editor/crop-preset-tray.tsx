"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { CategoryPreset, CropCategory } from "@/lib/crop-presets"

interface CropPresetTrayProps {
  categories: CropCategory[]
  selectedCategory: string | null
  selectedPreset: CategoryPreset | null
  customRatioWidth: string
  customRatioHeight: string
  currentCategoryLabel: string
  onSelectCategory: (categoryName: string) => void
  onSelectPreset: (preset: CategoryPreset) => void
  onChangeCustomWidth: (value: string) => void
  onChangeCustomHeight: (value: string) => void
  onHidePopup?: () => void
}

// Preset box: fixed width 48px, height varies by aspect ratio
const PRESET_WIDTH = 48

/**
 * Compute preset box dimensions: width is always 48px, height from ratio (w/h = ratio => h = w/ratio).
 */
const getBoxDimensions = (ratio: number) => {
  const w = PRESET_WIDTH
  const h = Math.max(20, Math.round(PRESET_WIDTH / ratio))
  return { w, h }
}

const CropPresetTray: React.FC<CropPresetTrayProps> = ({
  categories,
  selectedCategory,
  selectedPreset,
  customRatioWidth,
  customRatioHeight,
  currentCategoryLabel,
  onSelectCategory,
  onSelectPreset,
  onChangeCustomWidth,
  onChangeCustomHeight,
  onHidePopup,
}) => {
  const [hoveredPreset, setHoveredPreset] = useState<CategoryPreset | null>(null)

  // Shared tray wrapper: internal padding only – outer visual styling (bg, border, shadow, radius)
  // is applied by the portal wrapper in editor-canvas.tsx so box-shadow isn't clipped by overflow.
  const trayWrapperClass =
    "px-6 pt-5 pb-5 min-w-[320px] min-h-[240px]"

  // Initial info state – no category selected yet
  if (!selectedCategory) {
    return (
      <div className={`${trayWrapperClass} flex flex-col items-start gap-4 relative`}>
        <div className="w-full flex items-center justify-between gap-2">
          <div className="text-base font-semibold">Select media type:</div>
          {onHidePopup && (
            <button
              type="button"
              onClick={onHidePopup}
              className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Hide crop options"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="rounded-xl bg-[#E4E7FF] px-6 py-7 text-center text-[14px] leading-[1.5] text-[#3B3F5C] font-normal w-full">
          Choose a category to display the cropping presets aligned
          <br />
          with its standard formats for each type of media.
        </div>
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5 text-xs sm:text-sm font-sans font-normal">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => onSelectCategory(category.name)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full font-normal transition-all bg-[#F0F0F0] text-gray-700 hover:bg-[#E4E7FF]"
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const currentCategory = categories.find((cat) => cat.name === selectedCategory) || categories[0]

  // Determine what to show in title - hovered preset takes priority
  const displayPreset = hoveredPreset || selectedPreset

  return (
    <div className={`${trayWrapperClass} flex flex-col items-start gap-4 relative`}>
      {/* Title row with chevron to hide popup */}
      <div className="w-full flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {selectedCategory === "custom" ? (
            <div className="text-sm font-medium">Custom resolution:</div>
          ) : (
            <div>
              <div className="text-sm font-medium">
                {currentCategoryLabel} format:
                {displayPreset && (
                  <span className="text-[#6764F6] font-medium ml-1">
                    {displayPreset.label} ({displayPreset.displayRatio})
                  </span>
                )}
              </div>
              {currentCategory.description && (
                <div className="text-xs text-muted-foreground mt-2">
                  {currentCategory.description}
                </div>
              )}
            </div>
          )}
        </div>
        {onHidePopup && (
          <button
            type="button"
            onClick={onHidePopup}
            className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Hide crop options"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Preset buttons or custom inputs */}
      {selectedCategory === "custom" ? (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Type required image ratio:</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="Width"
              value={customRatioWidth}
              onChange={(e) => onChangeCustomWidth(e.target.value)}
              className="w-28 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#6764F6]"
            />
            <span className="text-muted-foreground text-sm">x</span>
            <input
              type="number"
              min={1}
              placeholder="Height"
              value={customRatioHeight}
              onChange={(e) => onChangeCustomHeight(e.target.value)}
              className="w-28 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#6764F6]"
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {customRatioWidth && customRatioHeight
              ? "Aspect ratio is locked to your custom values."
              : "Leave inputs empty to adjust the crop freely."}
          </div>
        </div>
      ) : (
        currentCategory.presets.length > 0 && (
          <div className="flex items-start gap-[23px] overflow-x-auto pb-2 w-full">
            {currentCategory.presets.map((preset) => {
              const isSelected = selectedPreset?.name === preset.name
              const { w, h } = getBoxDimensions(preset.ratio)

              return (
                <div
                  key={preset.name}
                  className="flex-shrink-0 flex items-start justify-center"
                  style={{ width: PRESET_WIDTH, minHeight: h }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    onMouseEnter={() => setHoveredPreset(preset)}
                    onMouseLeave={() => setHoveredPreset(null)}
                    className={`flex items-center justify-center rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-[#6764F6] text-[#6764F6] bg-[#F3E8FF]"
                        : "border-[#A9A9A9] text-[#A9A9A9] bg-white hover:border-[#6764F6] hover:text-[#6764F6] active:border-[#6764F6] active:text-[#6764F6]"
                    }`}
                    style={{ width: w, height: h }}
                  >
                    <span className="text-sm font-medium">{preset.displayRatio}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Category chips: same line, 8px gap, 20px from bottom (card pb-5), ABBvoice Regular */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5 text-xs sm:text-sm font-sans font-normal mt-auto">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.name
          return (
            <button
              key={category.name}
              onClick={() => onSelectCategory(category.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full font-normal transition-all ${
                isSelected ? "bg-[#6764F6] text-white shadow-sm" : "bg-[#F0F0F0] text-gray-700 hover:bg-[#E4E7FF]"
              }`}
            >
              {category.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CropPresetTray
