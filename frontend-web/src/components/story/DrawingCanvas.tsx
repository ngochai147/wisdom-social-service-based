import { useEffect, useCallback, useRef } from "react";
import type { DrawingTool } from "../../hooks/useStoryDrawing";

interface DrawingCanvasProps {
  width: number;
  height: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isDrawingRef: React.MutableRefObject<boolean>;
  lastPointRef: React.MutableRefObject<{ x: number; y: number } | null>;
  tool: DrawingTool;
  brushSize: number;
  brushOpacity: number;
  brushColor: string;
  onSaveToHistory: () => void;
  isActive: boolean;
}

export default function DrawingCanvas({
  width,
  height,
  canvasRef,
  isDrawingRef,
  lastPointRef,
  tool,
  brushSize,
  brushOpacity,
  brushColor,
  onSaveToHistory,
  isActive,
}: DrawingCanvasProps) {
  const arrowStartRef = useRef<{ x: number; y: number } | null>(null);
  const savedImageDataRef = useRef<ImageData | null>(null);

  // Initialize canvas (only set dimensions, don't clear existing content)
  const initializedRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Only initialize once to avoid clearing existing drawings
    if (initializedRef.current) return;
    initializedRef.current = true;

    canvas.width = width;
    canvas.height = height;
  }, [width, height]);

  // Get context
  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext("2d") || null;
  }, []);

  // Draw line
  const drawLine = useCallback(
    (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      ctx: CanvasRenderingContext2D
    ) => {
      if (tool === "none") return;

      ctx.save();

      if (tool === "eraser") {
        ctx.clearRect(
          fromX - brushSize / 2,
          fromY - brushSize / 2,
          brushSize,
          brushSize
        );
        ctx.clearRect(
          toX - brushSize / 2,
          toY - brushSize / 2,
          brushSize,
          brushSize
        );
      } else if (tool === "brush") {
        ctx.globalAlpha = brushOpacity;
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      } else if (tool === "neon") {
        ctx.globalAlpha = brushOpacity;
        ctx.strokeStyle = brushColor;
        ctx.shadowColor = brushColor;
        ctx.shadowBlur = brushSize * 2;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      } else if (tool === "highlighter") {
        ctx.globalAlpha = brushOpacity * 0.4;
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize * 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      }

      ctx.restore();
    },
    [tool, brushSize, brushOpacity, brushColor]
  );

  // Draw arrow
  const drawArrow = useCallback(
    (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      ctx: CanvasRenderingContext2D
    ) => {
      const headlen = 15;
      const angle = Math.atan2(toY - fromY, toX - fromX);

      ctx.save();
      ctx.globalAlpha = brushOpacity;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";

      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrowhead
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headlen * Math.cos(angle - Math.PI / 6),
        toY - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headlen * Math.cos(angle + Math.PI / 6),
        toY - headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();

      ctx.restore();
    },
    [brushSize, brushOpacity, brushColor]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === "none") return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      isDrawingRef.current = true;
      lastPointRef.current = { x, y };
      arrowStartRef.current = { x, y };

      if (tool === "arrow") {
        // Save current canvas state for preview
        const ctx = getCtx();
        if (ctx) {
          savedImageDataRef.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
      } else {
        const ctx = getCtx();
        if (ctx) {
          drawLine(x, y, x, y, ctx);
        }
      }
    },
    [tool, getCtx, drawLine]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || tool === "none") return;

      const canvas = canvasRef.current;
      if (!canvas || !lastPointRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (tool === "arrow") {
        // Show arrow preview by restoring saved state and redrawing arrow
        const ctx = getCtx();
        if (ctx && arrowStartRef.current && savedImageDataRef.current) {
          // Restore the saved state
          ctx.putImageData(savedImageDataRef.current, 0, 0);
          // Draw arrow preview
          drawArrow(
            arrowStartRef.current.x,
            arrowStartRef.current.y,
            x,
            y,
            ctx
          );
        }
      } else {
        const ctx = getCtx();
        if (ctx) {
          drawLine(lastPointRef.current.x, lastPointRef.current.y, x, y, ctx);
        }
        lastPointRef.current = { x, y };
      }
    },
    [tool, getCtx, drawLine, drawArrow]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || tool === "none") return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (tool === "arrow" && arrowStartRef.current) {
        const ctx = getCtx();
        if (ctx) {
          // Clear and redraw from saved state, then draw final arrow
          drawArrow(
            arrowStartRef.current.x,
            arrowStartRef.current.y,
            x,
            y,
            ctx
          );
        }
      }

      isDrawingRef.current = false;
      lastPointRef.current = null;
      arrowStartRef.current = null;

      // Save to history after stroke completes
      onSaveToHistory();
    },
    [tool, getCtx, drawArrow, onSaveToHistory]
  );

  // Handle touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (tool === "none") return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      isDrawingRef.current = true;
      lastPointRef.current = { x, y };
      arrowStartRef.current = { x, y };

      if (tool === "arrow") {
        // Save current canvas state for preview
        const ctx = getCtx();
        if (ctx) {
          savedImageDataRef.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
      } else {
        const ctx = getCtx();
        if (ctx) {
          drawLine(x, y, x, y, ctx);
        }
      }
    },
    [tool, getCtx, drawLine]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || tool === "none") return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas || !lastPointRef.current) return;

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ctx = getCtx();
      if (ctx) {
        drawLine(lastPointRef.current.x, lastPointRef.current.y, x, y, ctx);
      }
      lastPointRef.current = { x, y };
    },
    [tool, getCtx, drawLine]
  );

  const handleTouchEnd = useCallback(() => {
    if (tool === "none") return;

    isDrawingRef.current = false;
    lastPointRef.current = null;
    arrowStartRef.current = null;

    onSaveToHistory();
  }, [tool, onSaveToHistory]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 rounded-2xl ${
        isActive && tool !== "none" ? "cursor-crosshair" : "cursor-default"
      }`}
      style={{
        pointerEvents: isActive ? "auto" : "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}
