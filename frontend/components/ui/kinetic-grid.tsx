"use client";

import React, { useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  active: boolean;
}

export function KineticGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const BG_COLOR = "transparent";
  const ACTIVE_COLOR = "#A07F31"; // Gold
  const BASE_LINE_COLOR = "rgba(8, 29, 96, 0.12)";
  const BASE_NODE_COLOR = "rgba(8, 29, 96, 0.18)";
  const GRID_SIZE = 40;

  const MAX_WARP = 15;
  const INFLUENCE_RADIUS = 250;
  
  const state = useRef({
    width: 0,
    height: 0,
    points: [] as Point[],
    mouseX: -1000,
    mouseY: -1000,
    targetMouseX: -1000,
    targetMouseY: -1000,
    isHovering: false,
    ripples: [] as Ripple[],
    prefersReducedMotion: false,
    isVisible: true,
    isRunning: false,
    containerLeft: 0,
    containerTop: 0
  });

  const initGrid = () => {
    const s = state.current;
    s.points = [];
    const cols = Math.ceil(s.width / GRID_SIZE) + 1;
    const rows = Math.ceil(s.height / GRID_SIZE) + 1;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = j * GRID_SIZE;
        const y = i * GRID_SIZE;
        s.points.push({ x, y, originX: x, originY: y });
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let resizeTimeoutId: ReturnType<typeof setTimeout>;

    const render = (forceSingleFrame = false) => {
      const s = state.current;
      if (!s.isRunning && !forceSingleFrame) return;
      
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      
      const glowY = s.height * 0.4;
      const glow = ctx.createRadialGradient(s.width / 2, glowY, 0, s.width / 2, glowY, 600);
      glow.addColorStop(0, "rgba(255, 255, 255, 0.7)");
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, s.width, s.height);

      const isReduced = s.prefersReducedMotion;
      const time = Date.now() / 1000;
      const beamY = (Math.sin(time * 0.4) * 0.5 + 0.5) * s.height;

      if (!isReduced && s.isHovering) {
        s.mouseX += (s.targetMouseX - s.mouseX) * 0.1;
        s.mouseY += (s.targetMouseY - s.mouseY) * 0.1;
      } else {
        s.mouseX += (-1000 - s.mouseX) * 0.05;
        s.mouseY += (-1000 - s.mouseY) * 0.05;
      }

      const cols = Math.ceil(s.width / GRID_SIZE) + 1;

      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i];
        
        p.x += (p.originX - p.x) * 0.1;
        p.y += (p.originY - p.y) * 0.1;

        if (!isReduced && s.isHovering) {
          const dx = s.mouseX - p.originX;
          const dy = s.mouseY - p.originY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < INFLUENCE_RADIUS) {
            const force = (INFLUENCE_RADIUS - dist) / INFLUENCE_RADIUS;
            p.x = p.originX - (dx * force * (MAX_WARP / INFLUENCE_RADIUS));
            p.y = p.originY - (dy * force * (MAX_WARP / INFLUENCE_RADIUS));
          }
        }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i];
        
        const hasRight = (i + 1) % cols !== 0;
        const hasBottom = i + cols < s.points.length;
        
        let intensity = 0;
        if (!isReduced) {
          const dx = s.mouseX - p.x;
          const dy = s.mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < INFLUENCE_RADIUS) {
            intensity = (INFLUENCE_RADIUS - dist) / INFLUENCE_RADIUS;
          }
          
          const distToBeam = Math.abs(p.y - beamY);
          if (distToBeam < 200) {
            intensity = Math.max(intensity, ((200 - distToBeam) / 200) * 0.45);
          }
        }

        if (hasRight) {
          const right = s.points[i + 1];
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(right.x, right.y);
          if (intensity > 0.05) {
            const grad = ctx.createLinearGradient(p.x, p.y, right.x, right.y);
            grad.addColorStop(0, `rgba(160, 127, 49, ${Math.min(1, intensity * 1.5)})`);
            grad.addColorStop(1, BASE_LINE_COLOR);
            ctx.strokeStyle = grad;
          } else {
            ctx.strokeStyle = BASE_LINE_COLOR;
          }
          ctx.stroke();
        }

        if (hasBottom) {
          const bottom = s.points[i + cols];
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(bottom.x, bottom.y);
          if (intensity > 0.05) {
            const grad = ctx.createLinearGradient(p.x, p.y, bottom.x, bottom.y);
            grad.addColorStop(0, `rgba(160, 127, 49, ${Math.min(1, intensity * 1.5)})`);
            grad.addColorStop(1, BASE_LINE_COLOR);
            ctx.strokeStyle = grad;
          } else {
            ctx.strokeStyle = BASE_LINE_COLOR;
          }
          ctx.stroke();
        }
      }

      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i];
        let intensity = 0;
        
        if (!isReduced) {
          const dx = s.mouseX - p.x;
          const dy = s.mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < INFLUENCE_RADIUS) {
            intensity = (INFLUENCE_RADIUS - dist) / INFLUENCE_RADIUS;
          }
          
          const distToBeam = Math.abs(p.y - beamY);
          if (distToBeam < 200) {
            intensity = Math.max(intensity, ((200 - distToBeam) / 200) * 0.5);
          }
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        
        if (intensity > 0.1) {
          ctx.fillStyle = `rgba(160, 127, 49, ${0.2 + intensity * 0.8})`;
          ctx.shadowColor = ACTIVE_COLOR;
          ctx.shadowBlur = intensity * 10;
        } else {
          ctx.fillStyle = BASE_NODE_COLOR;
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
      }
      
      if (!forceSingleFrame && s.isRunning) {
        animationFrameId = requestAnimationFrame(() => render());
      }
    };

    const manageAnimationLoop = () => {
      const s = state.current;
      const isDocumentVisible = document.visibilityState === "visible";
      const shouldRun = s.isVisible && isDocumentVisible && !s.prefersReducedMotion;
      
      if (shouldRun && !s.isRunning) {
        s.isRunning = true;
        render();
      } else if (!shouldRun && s.isRunning) {
        s.isRunning = false;
        cancelAnimationFrame(animationFrameId);
      }
      
      if (!shouldRun) {
        render(true);
      }
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    state.current.prefersReducedMotion = mediaQuery.matches;
    const updateMotionPref = (e: MediaQueryListEvent) => {
      state.current.prefersReducedMotion = e.matches;
      manageAnimationLoop();
    };
    mediaQuery.addEventListener("change", updateMotionPref);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        state.current.width = width;
        state.current.height = height;
        
        clearTimeout(resizeTimeoutId);
        resizeTimeoutId = setTimeout(() => {
          const rect = container.getBoundingClientRect();
          state.current.containerLeft = rect.left + window.scrollX;
          state.current.containerTop = rect.top + window.scrollY;
        }, 100);
        
        initGrid();
        
        if (!state.current.isRunning) render(true);
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver((entries) => {
      state.current.isVisible = entries[0].isIntersecting;
      manageAnimationLoop();
    }, { threshold: 0 });
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      manageAnimationLoop();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const parent = container.parentElement;
    
    const handlePointerMove = (e: PointerEvent) => {
      const s = state.current;
      if (s.prefersReducedMotion) return;
      
      s.targetMouseX = e.pageX - s.containerLeft;
      s.targetMouseY = e.pageY - s.containerTop;
      
      if (!s.isHovering) {
        s.mouseX = s.targetMouseX;
        s.mouseY = s.targetMouseY;
        s.isHovering = true;
      }
    };

    const handlePointerLeave = () => {
      state.current.isHovering = false;
    };

    if (parent) {
      parent.addEventListener("pointermove", handlePointerMove);
      parent.addEventListener("pointerleave", handlePointerLeave);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeoutId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      mediaQuery.removeEventListener("change", updateMotionPref);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (parent) {
        parent.removeEventListener("pointermove", handlePointerMove);
        parent.removeEventListener("pointerleave", handlePointerLeave);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ opacity: 1 }}
      />
    </div>
  );
}
