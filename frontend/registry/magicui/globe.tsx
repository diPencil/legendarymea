"use client"

import { useEffect, useRef } from "react"
import createGlobe, { type COBEOptions } from "cobe"
import { useMotionValue, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

const MOVEMENT_DAMPING = 1400
const MEA_START_PHI = 0
const MEA_START_THETA = 0.25

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: MEA_START_PHI,
  theta: MEA_START_THETA,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [8 / 255, 38 / 255, 107 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [24.7136, 46.6753], size: 0.11 },
    { location: [25.2048, 55.2708], size: 0.09 },
    { location: [30.0444, 31.2357], size: 0.08 },
    { location: [-1.2921, 36.8219], size: 0.07 },
    { location: [6.5244, 3.3792], size: 0.07 },
    { location: [-26.2041, 28.0473], size: 0.07 },
    { location: [51.5072, -0.1276], size: 0.07 },
    { location: [41.0082, 28.9784], size: 0.07 },
    { location: [19.076, 72.8777], size: 0.08 },
    { location: [1.3521, 103.8198], size: 0.07 },
    { location: [35.6762, 139.6503], size: 0.07 },
    { location: [-33.8688, 151.2093], size: 0.07 },
    { location: [40.7128, -74.006], size: 0.08 },
    { location: [25.7617, -80.1918], size: 0.06 },
    { location: [19.4326, -99.1332], size: 0.07 },
    { location: [-23.5505, -46.6333], size: 0.08 },
  ],
}

export function Globe({ className, config = GLOBE_CONFIG }: { className?: string; config?: COBEOptions }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(MEA_START_PHI)
  const widthRef = useRef(0)
  const pointerInteracting = useRef<number | null>(null)
  const r = useMotionValue(0)
  const rs = useSpring(r, { mass: 1, damping: 30, stiffness: 100 })

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      r.set(r.get() + delta / MOVEMENT_DAMPING)
      pointerInteracting.current = clientX
    }
  }

  useEffect(() => {
    phiRef.current = config.phi ?? MEA_START_PHI
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const onResize = () => { if (canvasRef.current) widthRef.current = canvasRef.current.offsetWidth }
    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      onRender: (state) => {
        if (pointerInteracting.current === null && !reducedMotion) phiRef.current += 0.003
        state.phi = phiRef.current + rs.get()
        state.width = widthRef.current * 2
        state.height = widthRef.current * 2
      },
    })

    requestAnimationFrame(() => { if (canvasRef.current) canvasRef.current.style.opacity = "1" })
    return () => { globe.destroy(); window.removeEventListener("resize", onResize) }
  }, [rs, config])

  return (
    <div className={cn("globe-wrap", className)}>
      <canvas
        className="globe-canvas"
        ref={canvasRef}
        onPointerDown={(event) => updatePointerInteraction(event.clientX)}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(event) => updateMovement(event.clientX)}
        onTouchMove={(event) => event.touches[0] && updateMovement(event.touches[0].clientX)}
        aria-label="Interactive globe focused on the Middle East and Africa"
      />
    </div>
  )
}
