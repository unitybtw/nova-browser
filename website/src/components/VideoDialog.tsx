import { useEffect, useRef, useState, type RefObject } from 'react'
import { X } from 'lucide-react'
import type { Lang, SiteCopy } from '../content'

interface VideoDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  lang: Lang
  t: SiteCopy
  onClosed: () => void
}

export function VideoDialog({ dialogRef, lang, t, onClosed }: VideoDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoError, setVideoError] = useState(false)

  // Light-dismiss fallback for browsers without native <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if ('closedBy' in HTMLDialogElement.prototype) return

    let pressedOutside = false
    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect()
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
    }
    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event)
    }
    const onPointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event) && dialog.open) {
        dialog.close()
      }
      pressedOutside = false
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointerup', onPointerUp)
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointerup', onPointerUp)
    }
  }, [dialogRef])

  function handleClose() {
    if (dialogRef.current?.open) {
      dialogRef.current.close()
    }
    videoRef.current?.pause()
  }

  function handleNativeClose() {
    videoRef.current?.pause()
    setVideoError(false)
    if (dialogRef.current) {
      dialogRef.current.returnValue = ''
    }
    onClosed()
  }

  return (
    <dialog
      ref={dialogRef}
      className="video-dialog"
      aria-labelledby="video-title"
      aria-describedby="video-description"
      {...({ closedby: 'any' } as Record<string, string>)}
      onClose={handleNativeClose}
    >
      <div className="video-dialog-inner">
        <div className="video-heading">
          <h2 id="video-title">{t.videoTitle}</h2>
          <button
            type="button"
            className="dialog-close"
            onClick={handleClose}
            aria-label={t.close}
            autoFocus
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <video
          ref={videoRef}
          key={lang}
          src="/images/nova-tour.mp4"
          poster="/images/nova-tour.poster.jpg"
          controls
          playsInline
          preload="none"
          onError={() => setVideoError(true)}
        >
          <track
            kind="captions"
            src="/images/nova-tour.en.vtt"
            srcLang="en"
            label="English"
            default={lang === 'en'}
          />
          <track
            kind="captions"
            src="/images/nova-tour.tr.vtt"
            srcLang="tr"
            label="Türkçe"
            default={lang === 'tr'}
          />
        </video>

        {videoError && (
          <div className="video-error" role="alert">
            <p>{t.videoError}</p>
            <button
              type="button"
              className="btn btn--cobalt"
              onClick={() => {
                setVideoError(false)
                videoRef.current?.load()
              }}
            >
              {t.retryVideo}
            </button>
          </div>
        )}

        <p id="video-description" className="video-description">
          {t.videoDescription}
        </p>
      </div>
    </dialog>
  )
}
