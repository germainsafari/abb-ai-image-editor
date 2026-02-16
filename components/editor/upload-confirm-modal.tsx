"use client"

interface UploadConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function UploadConfirmModal({ isOpen, onClose, onConfirm }: UploadConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-5 lg:p-6">
      <div
        className="bg-white flex flex-col w-full max-w-[600px] overflow-hidden"
        style={{
          borderRadius: '8px',
          boxShadow: '0 0 58.2px 0 rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          className="flex flex-col overflow-auto"
          style={{ padding: '56px 40px', gap: '24px' }}
        >
          <h2
            className="text-black"
            style={{
              fontFamily: 'var(--font-abb-voice-display)',
              fontSize: '32px',
              fontWeight: 700,
              lineHeight: '120%',
            }}
          >
            WOULD YOU LIKE TO START AGAIN?
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-abb-voice)',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '150%',
              color: '#1F1F1F',
            }}
          >
            Continue editing your current image, or go back to the start of the editor
            to upload a new one. Choosing to upload a new image will take you to the intro page.
          </p>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={onClose}
              className="abb-gradient-hover-pill"
              style={{
                height: '48px',
                paddingLeft: '24px',
                paddingRight: '24px',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              <span className="text-[#000000]">Continue editing</span>
            </button>
            <button
              onClick={onConfirm}
              className="abb-red-button-gradient-hover text-white"
              style={{
                backgroundColor: '#FF000F',
                height: '48px',
                borderRadius: '28px',
                paddingLeft: '24px',
                paddingRight: '24px',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              Upload new image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
