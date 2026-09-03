"use client"

import { useState, useEffect } from 'react'
import { X, ExternalLink } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { getMediaFile } from '@/lib/dashboard/media'
import type { MediaFile } from '@/lib/dashboard/media'
import styles from '@/components/dashboard/dashboard.module.css'

interface MediaViewerProps {
  mediaId: number
  onClose: () => void
}

export function MediaViewer({ mediaId, onClose }: MediaViewerProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [media, setMedia] = useState<MediaFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMedia() {
      try {
        const res = await getMediaFile(mediaId)
        setMedia(res.data)
      } catch (err) {
        setError(copy.mediaDetailLoadError || 'Media could not be loaded.')
      } finally {
        setLoading(false)
      }
    }
    fetchMedia()
  }, [mediaId, copy])

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.employeeDialog} ${styles.companyDialog}`} role="dialog" aria-modal="true">
        <header className={styles.dialogHeader}>
          <h2>{media ? media.reference : copy.mediaDetails}</h2>
          <button type="button" onClick={onClose} aria-label={copy.close} className={styles.iconButton}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.companyForm} style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          {loading && <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>{copy.loadingData}...</div>}
          
          {error && (
            <div className={styles.pageNotice} role="alert">
              <p>{error}</p>
            </div>
          )}
          
          {media && (
            <>
              <fieldset className={styles.formSection}>
                <legend>{copy.mediaDetails.toUpperCase()}</legend>
                
                {media.type === 'image' ? (
                  <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', background: '#f5f5f5', display: 'flex', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media.safe_url} alt={media.alt_text_en || media.reference} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ marginBottom: '1.5rem', padding: '2rem', borderRadius: '8px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '2rem', color: '#666' }}>PDF</div>
                    <a href={media.safe_url} target="_blank" rel="noopener noreferrer" className={styles.secondaryButton} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                      <ExternalLink size={16} />
                      {copy.download || 'Open PDF'}
                    </a>
                  </div>
                )}
                
                <div className={styles.formGrid}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.type}</label>
                    <div style={{ fontSize: '0.875rem' }}>{media.type} ({media.mime_type})</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.fileSize}</label>
                    <div style={{ fontSize: '0.875rem' }}>{Math.round(media.size_bytes / 1024)} KB</div>
                  </div>
                  {media.type === 'image' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.dimensions}</label>
                      <div style={{ fontSize: '0.875rem' }}>{media.width} x {media.height} px</div>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.originalName}</label>
                    <div style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>{media.original_name}</div>
                  </div>
                </div>
              </fieldset>

              <fieldset className={styles.formSection}>
                <legend>{copy.mediaContext.toUpperCase()}</legend>
                <div className={styles.formGrid}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.altTextEn}</label>
                    <div style={{ fontSize: '0.875rem' }} dir="ltr">{media.alt_text_en || '-'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.altTextAr}</label>
                    <div style={{ fontSize: '0.875rem' }} dir="rtl">{media.alt_text_ar || '-'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.captionEn}</label>
                    <div style={{ fontSize: '0.875rem' }} dir="ltr">{media.caption_en || '-'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{copy.captionAr}</label>
                    <div style={{ fontSize: '0.875rem' }} dir="rtl">{media.caption_ar || '-'}</div>
                  </div>
                </div>
              </fieldset>
            </>
          )}
        </div>

        <footer className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            {copy.close}
          </button>
        </footer>
      </div>
    </div>
  )
}
