'use client'

import { RefObject, useEffect, useState } from 'react'

type Point = { x: number; y: number }
type BeamRef = RefObject<HTMLElement | null>

type AnimatedBeamProps = {
  containerRef: BeamRef
  fromRef: BeamRef
  toRef: BeamRef
  delay?: number
}

function centerWithin(element: HTMLElement, container: HTMLElement): Point {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: elementRect.left - containerRect.left + elementRect.width / 2,
    y: elementRect.top - containerRect.top + elementRect.height / 2,
  }
}

export function AnimatedBeam({ containerRef, fromRef, toRef, delay = 0 }: AnimatedBeamProps) {
  const [path, setPath] = useState('M 0 0 L 0 0')

  useEffect(() => {
    const updatePath = () => {
      const container = containerRef.current
      const from = fromRef.current
      const to = toRef.current
      if (!container || !from || !to) return
      const start = centerWithin(from, container)
      const end = centerWithin(to, container)
      const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
      if (horizontal) {
        const controlX = start.x + (end.x - start.x) / 2
        setPath(`M ${start.x} ${start.y} C ${controlX} ${start.y}, ${controlX} ${end.y}, ${end.x} ${end.y}`)
      } else {
        const controlY = start.y + (end.y - start.y) / 2
        setPath(`M ${start.x} ${start.y} C ${start.x} ${controlY}, ${end.x} ${controlY}, ${end.x} ${end.y}`)
      }
    }

    const frame = requestAnimationFrame(updatePath)
    const observer = new ResizeObserver(updatePath)
    if (containerRef.current) observer.observe(containerRef.current)
    if (fromRef.current) observer.observe(fromRef.current)
    if (toRef.current) observer.observe(toRef.current)
    window.addEventListener('resize', updatePath)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePath)
    }
  }, [containerRef, fromRef, toRef])

  return <svg className="platform-beam" aria-hidden="true"><path className="platform-beam-track" d={path} /><path className="platform-beam-signal" d={path} style={{ animationDelay: `${delay}s` }} /></svg>
}
