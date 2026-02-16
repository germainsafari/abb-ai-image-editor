"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

const TOOL_DESCRIPTIONS: Record<string, string> = {
  "undo-redo":
    "Step back or forward through your editing history to compare or revert changes.",
  crop:
    "Crop your image to standard social media formats or enter custom dimensions.",
  "ai-edit":
    "Use AI to transform the scene or background while keeping the main subject intact.",
  blur:
    "Apply a blur effect to the entire image for privacy or content protection.",
  export:
    "Export your final image as PNG or JPG, add metadata, or upload directly to Media Bank.",
  "upload-new":
    "Start fresh by uploading a new image to edit from scratch.",
}

interface CardPosition {
  id: string
  text: string
  anchorX: number
  x: number
  y: number
  arrowDirection: "down" | "up"
}

function QuestionIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 2.375C6.68426 2.375 2.375 6.68426 2.375 12C2.375 17.3157 6.68426 21.625 12 21.625C17.3157 21.625 21.625 17.3157 21.625 12C21.625 6.68426 17.3157 2.375 12 2.375Z"
        fill={color}
      />
      <circle cx="12" cy="16.75" r="1.125" fill={color} />
      <path
        d="M10 9.5C10 8.39543 10.8954 7.5 12 7.5C13.1046 7.5 14 8.39543 14 9.5C14 10.3284 13.4978 11.0384 12.7808 11.335C12.3186 11.526 12 11.9766 12 12.5V14"
        stroke={color}
        strokeWidth="1.375"
        strokeLinecap="round"
      />
    </svg>
  )
}

interface HowItWorksProps {
  isActive: boolean
  onToggle: () => void
}

export function HowItWorksButton({ isActive, onToggle }: HowItWorksProps) {
  const [isHovered, setIsHovered] = useState(false)

  const bgColor = isActive
    ? "var(--ABB-Red, #FF000F)"
    : isHovered
      ? "var(--ABB-Lilac, #6764F6)"
      : "var(--ABB-Gray-05, #F0F0F0)"

  const iconColor = isActive || isHovered ? "#FFFFFF" : "#000000"

  return (
    <div className="relative">
      {isHovered && !isActive && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap pointer-events-none"
          style={{
            background: '#1F1F1F',
            color: '#FFFFFF',
            fontFamily: 'var(--font-abb-voice)',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '100%',
            padding: '8px 12px',
            borderRadius: '4px',
          }}
        >
          How it works
          <div
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1F1F1F',
            }}
          />
        </div>
      )}

      <button
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="transition-colors"
        style={{
          display: 'inline-flex',
          padding: '12px',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          borderRadius: '24px',
          background: bgColor,
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label={isActive ? "Close walkthrough" : "How it works"}
      >
        {isActive ? (
          <Image
            src="/Bar Icons.svg"
            alt="Close"
            width={24}
            height={24}
            style={{ width: '24px', height: '24px', aspectRatio: '1/1' }}
          />
        ) : (
          <QuestionIcon color={iconColor} />
        )}
      </button>
    </div>
  )
}

const CARD_WIDTH = 240
const CARD_GAP = 8
const VIEWPORT_PAD = 12
const ARROW_GAP = 14

function resolveOverlaps(cards: CardPosition[], viewportWidth: number) {
  if (cards.length === 0) return

  cards.sort((a, b) => a.x - b.x)

  for (let i = 1; i < cards.length; i++) {
    const prevRight = cards[i - 1].x + CARD_WIDTH + CARD_GAP
    if (cards[i].x < prevRight) {
      cards[i].x = prevRight
    }
  }

  const last = cards[cards.length - 1]
  if (last.x + CARD_WIDTH > viewportWidth - VIEWPORT_PAD) {
    const overflow = last.x + CARD_WIDTH - (viewportWidth - VIEWPORT_PAD)
    for (let i = cards.length - 1; i >= 0; i--) {
      cards[i].x -= overflow
      if (i > 0) {
        const prevRight = cards[i - 1].x + CARD_WIDTH + CARD_GAP
        if (cards[i].x < prevRight) {
          break
        }
      }
    }

    for (let i = cards.length - 2; i >= 0; i--) {
      const nextLeft = cards[i + 1].x
      if (cards[i].x + CARD_WIDTH + CARD_GAP > nextLeft) {
        cards[i].x = nextLeft - CARD_WIDTH - CARD_GAP
      }
    }
  }

  if (cards[0].x < VIEWPORT_PAD) {
    const shift = VIEWPORT_PAD - cards[0].x
    for (const card of cards) {
      card.x += shift
    }
  }
}

export function HowItWorksOverlay({ onClose }: { onClose: () => void }) {
  const [cards, setCards] = useState<CardPosition[]>([])

  const calculatePositions = useCallback(() => {
    const vw = window.innerWidth
    const bottomCards: CardPosition[] = []
    const topCards: CardPosition[] = []

    function pillCenter(selector: string): { cx: number; cy: number; top: number; bottom: number } | null {
      const el = document.querySelector(selector)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, top: r.top, bottom: r.bottom }
    }

    function groupCenter(sel1: string, sel2: string): { cx: number; cy: number; top: number; bottom: number } | null {
      const e1 = document.querySelector(sel1)
      const e2 = document.querySelector(sel2)
      if (!e1 || !e2) return null
      const r1 = e1.getBoundingClientRect()
      const r2 = e2.getBoundingClientRect()
      return {
        cx: (r1.left + r2.right) / 2,
        cy: (r1.top + r1.bottom) / 2,
        top: Math.min(r1.top, r2.top),
        bottom: Math.max(r1.bottom, r2.bottom),
      }
    }

    const undoRedo = groupCenter('[data-tool-pill="undo-redo"]', '[data-tool-pill="undo-redo"]')
    if (undoRedo) {
      bottomCards.push({
        id: "undo-redo",
        text: TOOL_DESCRIPTIONS["undo-redo"],
        anchorX: undoRedo.cx,
        x: undoRedo.cx - CARD_WIDTH / 2,
        y: undoRedo.top - ARROW_GAP,
        arrowDirection: "down",
      })
    }

    const crop = pillCenter('[data-tool-pill="crop"]')
    if (crop) {
      bottomCards.push({
        id: "crop",
        text: TOOL_DESCRIPTIONS["crop"],
        anchorX: crop.cx,
        x: crop.cx - CARD_WIDTH / 2,
        y: crop.top - ARROW_GAP,
        arrowDirection: "down",
      })
    }

    const ai = pillCenter('[data-tool-pill="ai-edit"]')
    if (ai) {
      bottomCards.push({
        id: "ai-edit",
        text: TOOL_DESCRIPTIONS["ai-edit"],
        anchorX: ai.cx,
        x: ai.cx - CARD_WIDTH / 2,
        y: ai.top - ARROW_GAP,
        arrowDirection: "down",
      })
    }

    const blur = pillCenter('[data-tool-pill="blur"]')
    if (blur) {
      bottomCards.push({
        id: "blur",
        text: TOOL_DESCRIPTIONS["blur"],
        anchorX: blur.cx,
        x: blur.cx - CARD_WIDTH / 2,
        y: blur.top - ARROW_GAP,
        arrowDirection: "down",
      })
    }

    const exportPill = pillCenter('[data-tool-pill="export"]')
    if (exportPill) {
      bottomCards.push({
        id: "export",
        text: TOOL_DESCRIPTIONS["export"],
        anchorX: exportPill.cx,
        x: exportPill.cx - CARD_WIDTH / 2,
        y: exportPill.top - ARROW_GAP,
        arrowDirection: "down",
      })
    }

    resolveOverlaps(bottomCards, vw)

    const upload = pillCenter('[data-tool-pill="upload-new"]')
    if (upload) {
      topCards.push({
        id: "upload-new",
        text: TOOL_DESCRIPTIONS["upload-new"],
        anchorX: upload.cx,
        x: Math.min(upload.cx - CARD_WIDTH / 2, vw - CARD_WIDTH - VIEWPORT_PAD),
        y: upload.bottom + ARROW_GAP,
        arrowDirection: "up",
      })
    }

    setCards([...bottomCards, ...topCards])
  }, [])

  useEffect(() => {
    calculatePositions()
    window.addEventListener("resize", calculatePositions)
    return () => window.removeEventListener("resize", calculatePositions)
  }, [calculatePositions])

  return (
    <>
      {/* Dark overlay — z-55 */}
      <div
        className="fixed inset-0 z-[55]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.60)' }}
        onClick={onClose}
      />

      {/* Annotation cards — z-58 (above toolbar at z-57) */}
      {cards.map((card) => {
        const arrowLeft = card.anchorX - card.x

        return (
          <div
            key={card.id}
            className="fixed z-[58] pointer-events-none"
            style={{
              left: `${card.x}px`,
              top: `${card.y}px`,
              width: `${CARD_WIDTH}px`,
              ...(card.arrowDirection === "down"
                ? { transform: 'translateY(-100%)' }
                : {}),
            }}
          >
            {/* Arrow pointing up (card below element) */}
            {card.arrowDirection === "up" && (
              <div
                className="absolute"
                style={{
                  top: '-6px',
                  left: `${Math.max(16, Math.min(arrowLeft, CARD_WIDTH - 16))}px`,
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderBottom: '7px solid #262626',
                }}
              />
            )}

            {/* Card body */}
            <div
              style={{
                background: '#262626',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-abb-voice)',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '150%',
                  color: '#FFFFFF',
                  margin: 0,
                }}
              >
                {card.text}
              </p>
            </div>

            {/* Arrow pointing down (card above element) */}
            {card.arrowDirection === "down" && (
              <div
                className="absolute"
                style={{
                  bottom: '-6px',
                  left: `${Math.max(16, Math.min(arrowLeft, CARD_WIDTH - 16))}px`,
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderTop: '7px solid #262626',
                }}
              />
            )}
          </div>
        )
      })}
    </>
  )
}
