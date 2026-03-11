"use client"

import React from "react"

type LoaderProps = {
  size?: number
  /** Ring thickness in px (maps to inner padding of the conic ring). */
  strokeWidth?: number
  speedMs?: number
  fromColor?: string
  toColor?: string
  className?: string
}

/**
 * ABB Conic-mask spinner
 * Constant-speed rotation with a masked ring and conic gradient (red → violet).
 * Uses mask-composite: subtract with a WebKit fallback.
 */
export function ABBLoader({
  size = 48,
  strokeWidth = 6,
  speedMs = 900,
  fromColor = "#E00000",
  toColor = "#A080E0",
  className,
}: LoaderProps) {
  const cut = 10

  return (
    <span
      role="status"
      aria-label="Loading"
      className={className}
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="abb-conic-loader"
        style={{
          width: size,
          height: size,
          padding: strokeWidth,
          borderRadius: "9999px",
          background: `conic-gradient(from 0deg, ${fromColor}, ${toColor}, ${fromColor})`,
          animationDuration: `${speedMs}ms`,
          WebkitMask: `conic-gradient(#0000 ${cut}%, #000), linear-gradient(#000 0 0) content-box`,
          WebkitMaskComposite: "source-out",
          mask: `conic-gradient(#0000 ${cut}%, #000), linear-gradient(#000 0 0) content-box`,
          maskComposite: "subtract" as React.CSSProperties["maskComposite"],
          boxSizing: "border-box",
        }}
      />

      <style>{`
        @keyframes abb-conic-spin {
          to { transform: rotate(1turn); }
        }
        .abb-conic-loader {
          animation-name: abb-conic-spin;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .abb-conic-loader { animation: none !important; }
        }
      `}</style>
    </span>
  )
}

