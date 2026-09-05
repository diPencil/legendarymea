"use client"

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { replaceMediaFile, uploadMediaFile, updateMediaFile } from '@/lib/dashboard/media'
import type { MediaFile, UpdateMediaInput } from '@/lib/dashboard/media'
import styles from '@/components/dashboard/dashboard.module.css'

interface MediaFormProps {
  mode: 'upload' | 'edit' | 'replace'
  mediaFile?: MediaFile
  onClose: () => void
  onSuccess: () => void
}

export function MediaForm({ mode, mediaFile, onClose, onSuccess }: MediaFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [file, setFile] = useState<File | null>(null)
  
  const [altTextEn, setAltTextEn] = useState('')
  const [altTextAr, setAltTextAr] = useState('')
  const [captionEn, setCaptionEn] = useState('')
  const [captionAr, setCaptionAr] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (mode === 'edit' && mediaFile) {
      setAltTextEn(mediaFile.alt_text_en || '')
      setAltTextAr(mediaFile.alt_text_ar || '')
      setCaptionEn(mediaFile.caption_en || '')
      setCaptionAr(mediaFile.caption_ar || '')
    }
  }, [mode, mediaFile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    if ((mode === 'upload' || mode === 'replace') && !file) {
      setErrors({ general: [copy.fileRequiredMessage || 'A file is required.'] })
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'upload') {
        await uploadMediaFile(file!)
      } else if (mode === 'replace' && mediaFile) {
        await replaceMediaFile(mediaFile.id, file!)
      } else if (mode === 'edit' && mediaFile) {
        const payload: UpdateMediaInput = {
          alt_text_en: altTextEn || undefined,
          alt_text_ar: altTextAr || undefined,
          caption_en: captionEn || undefined,
          caption_ar: captionAr || undefined,
        }
        await updateMediaFile(mediaFile.id, payload)
      }

      onSuccess()
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; data?: { errors?: Record<string, string[]> } }
      if (error.status === 422 && error.data?.errors) {
        setErrors(error.data.errors)
      } else {
        setErrors({ general: [error.message ?? 'Error saving media'] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.employeeDialog} ${styles.companyDialog}`} role="dialog" aria-modal="true">
        <header className={styles.dialogHeader}>
          <h2>{mode === 'upload' ? copy.uploadMediaTitle : mode === 'replace' ? 'Replace media' : copy.editMediaTitle}</h2>
          <button type="button" onClick={onClose} aria-label={copy.close} className={styles.iconButton}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form id="media-form" onSubmit={handleSubmit} className={styles.companyForm}>
          {errors.general && (
            <div className={styles.pageNotice} role="alert">
              <p>{errors.general[0]}</p>
            </div>
          )}

          <fieldset className={styles.formSection}>
            <legend>{copy.mediaDetails.toUpperCase()}</legend>
            <div className={styles.formGrid}>
              {(mode === 'upload' || mode === 'replace') && (
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="media_file">
                    {mode === 'replace' ? 'Replacement image/file' : copy.file} <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="file"
                    id="media_file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {mode === 'replace' && mediaFile?.is_in_use ? (
                    <p className={styles.formHelp}>This keeps {mediaFile.reference} and updates every existing usage automatically.</p>
                  ) : null}
                  {errors.file && <p className={styles.fieldError}>{errors.file[0]}</p>}
                </div>
              )}
              
              {mode === 'edit' && (
                <>
                  <div className={styles.formField}>
                    <label htmlFor="media_alt_text_en">{copy.altTextEn}</label>
                    <input
                      type="text"
                      id="media_alt_text_en"
                      value={altTextEn}
                      onChange={(e) => setAltTextEn(e.target.value)}
                      dir="ltr"
                    />
                    {errors.alt_text_en && <p className={styles.fieldError}>{errors.alt_text_en[0]}</p>}
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="media_alt_text_ar">{copy.altTextAr}</label>
                    <input
                      type="text"
                      id="media_alt_text_ar"
                      value={altTextAr}
                      onChange={(e) => setAltTextAr(e.target.value)}
                      dir="rtl"
                    />
                    {errors.alt_text_ar && <p className={styles.fieldError}>{errors.alt_text_ar[0]}</p>}
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="media_caption_en">{copy.captionEn}</label>
                    <input
                      type="text"
                      id="media_caption_en"
                      value={captionEn}
                      onChange={(e) => setCaptionEn(e.target.value)}
                      dir="ltr"
                    />
                    {errors.caption_en && <p className={styles.fieldError}>{errors.caption_en[0]}</p>}
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="media_caption_ar">{copy.captionAr}</label>
                    <input
                      type="text"
                      id="media_caption_ar"
                      value={captionAr}
                      onChange={(e) => setCaptionAr(e.target.value)}
                      dir="rtl"
                    />
                    {errors.caption_ar && <p className={styles.fieldError}>{errors.caption_ar[0]}</p>}
                  </div>
                </>
              )}
            </div>
          </fieldset>
        </form>

        <footer className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
            {copy.cancel}
          </button>
          <button type="submit" form="media-form" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className={styles.spinner} aria-hidden="true" />
                {copy.saving}
              </>
            ) : (
              copy.save
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
