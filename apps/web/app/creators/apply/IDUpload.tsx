'use client'

import { useId, useRef, useState } from 'react'

type Capture = boolean | 'user' | 'environment'

type Props = {
  name: string
  label: string
  hint?: string
  required?: boolean
  accept?: string
  maxBytes?: number // default 10 MB
  /** When true or string, hints mobile to open the camera. 'user' = front camera, 'environment' = rear. */
  capture?: Capture
  /** Render an extra "Take a photo" button (clicks the input). */
  showTakePhoto?: boolean
}

export default function IDUpload({
  name,
  label,
  hint,
  required = false,
  accept = 'image/*,.pdf',
  maxBytes = 10 * 1024 * 1024,
  capture = false,
  showTakePhoto = true,
}: Props) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setFile(null)
    setPreviewUrl('')

    const f = e.target.files?.[0]
    if (!f) return

    if (f.size > maxBytes) {
      setError(`File too large (max ${(maxBytes / 1024 / 1024).toFixed(0)} MB).`)
      e.currentTarget.value = ''
      return
    }

    const okTypes = accept.split(',').map(s => s.trim())
    const isPdf = f.type === 'application/pdf' && okTypes.includes('.pdf')
    const isImage = f.type.startsWith('image/') && okTypes.some(t => t === 'image/*' || t.startsWith('image'))
    if (!isPdf && !isImage) {
      setError('Unsupported file type. Please upload a JPG/PNG or PDF.')
      e.currentTarget.value = ''
      return
    }

    setFile(f)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
    }
  }

  // normalize capture attribute for React (nonstandard attribute -> pass string)
  const captureAttr =
    capture === true ? 'user' : capture ? capture : undefined

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm text-zinc-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          id={inputId}
          name={name}
          type="file"
          required={required}
          accept={accept}
          // @ts-ignore capture is a valid nonstandard attribute on mobile browsers
          capture={captureAttr}
          onChange={onFileChange}
          className="block w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200 hover:file:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-auto"
          aria-describedby={hint ? `${inputId}-hint` : undefined}
        />

        {showTakePhoto && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            aria-label="Take a photo with your camera"
          >
            📷 Take photo
          </button>
        )}
      </div>

      {hint && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-zinc-400">
          {hint}
        </p>
      )}

      {file && !error && (
        <div className="mt-2 flex items-center gap-3 text-sm text-zinc-300">
          <span className="rounded bg-zinc-800 px-2 py-1">{file.name}</span>
          <span className="text-zinc-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
        </div>
      )}

      {previewUrl && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview of uploaded image"
            className="h-36 w-auto rounded-md border border-zinc-800 bg-zinc-950 object-contain"
          />
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
