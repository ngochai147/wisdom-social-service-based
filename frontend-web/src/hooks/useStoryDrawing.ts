import { useState, useRef, useCallback } from "react";

export type DrawingTool =
    | "brush"
    | "eraser"
    | "neon"
    | "highlighter"
    | "arrow"
    | "none";

export interface DrawingState {
    tool: DrawingTool;
    brushSize: number;
    brushOpacity: number;
    brushColor: string;
    canvasImageData: ImageData | null;
    history: ImageData[];
    historyStep: number;
}

const DEFAULT_DRAWING_STATE: DrawingState = {
    tool: "none",
    brushSize: 4,
    brushOpacity: 1,
    brushColor: "#ffffff",
    canvasImageData: null,
    history: [],
    historyStep: -1,
};

export function useStoryDrawing() {
    const [drawingState, setDrawingState] = useState<DrawingState>(
        DEFAULT_DRAWING_STATE
    );

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    // Set tool
    const setTool = useCallback((tool: DrawingTool) => {
        setDrawingState((prev) => ({ ...prev, tool }));
    }, []);

    // Set brush size
    const setBrushSize = useCallback((size: number) => {
        setDrawingState((prev) => ({ ...prev, brushSize: Math.max(1, Math.min(50, size)) }));
    }, []);

    // Set brush opacity
    const setBrushOpacity = useCallback((opacity: number) => {
        setDrawingState((prev) => ({
            ...prev,
            brushOpacity: Math.max(0, Math.min(1, opacity)),
        }));
    }, []);

    // Set brush color
    const setBrushColor = useCallback((color: string) => {
        setDrawingState((prev) => ({ ...prev, brushColor: color }));
    }, []);

    // Save state to history
    const saveToHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setDrawingState((prev) => {
            // Remove any history after current step (for new drawing after undo)
            const newHistory = prev.history.slice(0, prev.historyStep + 1);
            newHistory.push(imageData);

            return {
                ...prev,
                history: newHistory,
                historyStep: newHistory.length - 1,
                canvasImageData: imageData,
            };
        });
    }, []);

    // Undo
    const undo = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setDrawingState((prev) => {
            if (prev.historyStep <= 0) return prev;

            const newStep = prev.historyStep - 1;
            const ctx = canvas.getContext("2d");
            if (ctx && prev.history[newStep]) {
                ctx.putImageData(prev.history[newStep], 0, 0);
            }

            return {
                ...prev,
                historyStep: newStep,
                canvasImageData: prev.history[newStep],
            };
        });
    }, []);

    // Redo
    const redo = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setDrawingState((prev) => {
            if (prev.historyStep >= prev.history.length - 1) return prev;

            const newStep = prev.historyStep + 1;
            const ctx = canvas.getContext("2d");
            if (ctx && prev.history[newStep]) {
                ctx.putImageData(prev.history[newStep], 0, 0);
            }

            return {
                ...prev,
                historyStep: newStep,
                canvasImageData: prev.history[newStep],
            };
        });
    }, []);

    // Clear canvas
    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveToHistory();
        }
    }, [saveToHistory]);

    // Get canvas image as data URL
    const getCanvasImage = useCallback((): string | null => {
        const canvas = canvasRef.current;
        return canvas ? canvas.toDataURL("image/png") : null;
    }, []);

    return {
        drawingState,
        canvasRef,
        isDrawingRef,
        lastPointRef,
        setTool,
        setBrushSize,
        setBrushOpacity,
        setBrushColor,
        saveToHistory,
        undo,
        redo,
        clearCanvas,
        getCanvasImage,
    };
}
