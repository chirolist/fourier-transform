"use client";

import { useEffect, useRef } from "react";

interface CanvasChartProps {
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  label: string;
  className?: string;
  onPress?: (x: number, y: number, width: number, height: number) => void;
}

export function CanvasChart({ draw, label, className, onPress }: CanvasChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const paint = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width < 8 || height < 8) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(context, width, height);
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className={className}
      onClick={
        onPress
          ? (event) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              onPress(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
            }
          : undefined
      }
    />
  );
}

export function AxisCaption({ y, x }: { y: string; x: string }) {
  return (
    <div className="mt-1 flex items-center justify-between gap-3 text-[11px] tracking-wide text-[#8a8175]">
      <span>縦軸: {y}</span>
      <span>横軸: {x}</span>
    </div>
  );
}
