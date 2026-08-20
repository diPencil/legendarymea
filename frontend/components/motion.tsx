'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } }, { threshold: 0.1, rootMargin: '0px 0px -15% 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}>{children}</div>
}

export function StaggerGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`stagger-grid ${className}`}>{children}</div>
}

export function ParallaxImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return <div className={`image-reveal ${className}`}><img src={src} alt={alt} /></div>
}

export function ScrollTop() {
  const [shown, setShown] = useState(false)
  useEffect(() => { const onScroll = () => setShown(window.scrollY > 560); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])
  return <button className={`scroll-top ${shown ? 'is-shown' : ''}`} aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
}
