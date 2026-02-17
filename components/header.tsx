"use client"

import Link from "next/link"
import Image from "next/image"

interface HeaderProps {
  onUploadNewImage?: () => void
  showUploadButton?: boolean
  walkthroughActive?: boolean
}

export default function Header({ onUploadNewImage, showUploadButton = false, walkthroughActive = false }: HeaderProps) {
  return (
    <header
      className={`h-[72px] w-full sticky top-0 flex-shrink-0 flex items-center ${
        walkthroughActive
          ? 'z-[57] border-b border-transparent bg-transparent'
          : 'z-40 border-b border-border bg-background'
      }`}
      style={{
        paddingLeft: "var(--Spacing-Grid-margin, 48px)",
        paddingRight: "var(--Spacing-Grid-margin, 48px)",
        ...(walkthroughActive ? { pointerEvents: 'none' as const } : {}),
      }}
    >
      <div className="h-full w-full flex items-center justify-between">
        {/* ABB Logo pill */}
        <div
          data-tool-pill="abb-logo"
          className="flex items-center justify-center flex-shrink-0"
          style={walkthroughActive ? {
            width: '112px',
            height: '58px',
            borderRadius: '36px',
            background: '#FFFFFF',
          } : undefined}
        >
          <Link href="/" className="flex items-center flex-shrink-0">
            <svg width="72" height="30" viewBox="0 0 64 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <mask
                id="mask0"
                style={{ maskType: "luminance" }}
                maskUnits="userSpaceOnUse"
                x="0"
                y="12"
                width="12"
                height="13"
              >
                <path fillRule="evenodd" clipRule="evenodd" d="M0 12.4399H11.8479V24.0765H0V12.4399Z" fill="white" />
              </mask>
              <g mask="url(#mask0)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.16106 12.4399L-0.0436859 24.0765H6.15083L7.88565 18.9855H11.8488V12.4399H4.16106Z"
                  fill="#FF000F"
                />
              </g>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.849 0.074707H8.62913L4.42513 11.7113H11.849V0.074707Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12.5908 18.9845H16.5555L18.2903 24.0755H24.4833L20.2793 12.439H12.5908V18.9845Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M20.0162 11.7113L15.8122 0.074707H12.5908V11.7113H20.0162Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M62.5766 11.7113C61.8185 10.7091 60.8202 9.89087 59.6652 9.34031C61.012 8.4203 61.8943 6.89446 61.8943 5.1657C61.8943 2.35402 59.5648 0.074707 56.6913 0.074707H54.9572V11.7113H62.5766Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M54.9572 12.439V24.0755H56.1963C60.5757 24.0755 64 20.6035 64 16.3183C64 14.9037 63.7339 13.5801 63.059 12.439H54.9572Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M46.782 11.7113H54.2148V0.074707H46.782V11.7113Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M46.782 24.0755H54.2148V12.439H46.782V24.0755Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M42.5067 11.7113C41.7493 10.7091 40.7511 9.89087 39.596 9.34031C40.9421 8.4203 41.8251 6.89446 41.8251 5.1657C41.8251 2.35402 39.4957 0.074707 36.6221 0.074707H34.888V11.7113H42.5067Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M34.888 12.439V24.0755H36.1271C40.5065 24.0755 43.9308 20.6035 43.9308 16.3183C43.9308 14.9037 43.6647 13.5801 42.9898 12.439H34.888Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M26.7129 11.7113H34.1457V0.074707H26.7129V11.7113Z"
                fill="#FF000F"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M26.7129 24.0755H34.1457V12.439H26.7129V24.0755Z"
                fill="#FF000F"
              />
            </svg>
          </Link>
        </div>

        {/* Center Title - hidden when walkthrough is active */}
        <div className="flex-1 text-center">
          {!walkthroughActive && (
            <h1 className="text-sm sm:text-base font-semibold text-foreground">
              AI Image Editor <span className="text-xs sm:text-sm font-normal text-muted-foreground">Beta</span>
            </h1>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {showUploadButton && (
            <div
              data-tool-pill="upload-new"
              className="flex items-center justify-center"
              style={walkthroughActive ? {
                height: '58px',
                borderRadius: '36px',
                background: '#FFFFFF',
                paddingLeft: '16px',
                paddingRight: '16px',
              } : undefined}
            >
              <button
                data-tool="upload-new"
                onClick={onUploadNewImage}
                className="flex items-center"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--Shades-Grey-90, var(--Colour-Shades-Grey-grey-90, #1F1F1F))',
                  fontFamily: 'var(--font-abb-voice)',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '100%',
                  textDecorationLine: 'underline',
                  textDecorationStyle: 'solid' as const,
                  textDecorationSkipInk: 'auto' as const,
                  textDecorationThickness: 'auto',
                  textUnderlineOffset: 'auto',
                  textUnderlinePosition: 'from-font' as const,
                }}
              >
                Upload new image
              </button>
            </div>
          )}

          {/* Logout button pill */}
          <div
            data-tool-pill="logout"
            className="flex items-center justify-center"
            style={walkthroughActive ? {
              width: '58px',
              height: '58px',
              borderRadius: '36px',
              background: '#FFFFFF',
            } : undefined}
          >
            <button 
              type="button"
              className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center hover:bg-transparent focus:outline-none focus-visible:outline-none"
              aria-label="Logout"
            >
              <Image 
                src="/navbar Icon on the top right corner.svg" 
                alt="Logout" 
                width={24} 
                height={24}
                className="w-5 h-5 sm:w-6 sm:h-6"
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
