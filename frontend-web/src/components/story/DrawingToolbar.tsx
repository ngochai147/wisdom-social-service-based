import {
  Pen,
  Eraser,
  Zap,
  Highlighter,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import type { DrawingTool } from "../../hooks/useStoryDrawing";

interface DrawingToolbarProps {
  tool: DrawingTool;
  brushSize: number;
  brushOpacity: number;
  brushColor: string;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  onBrushColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClose: () => void;
}

const TOOLS: { id: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { id: "brush", icon: <Pen size={18} />, label: "Brush" },
  { id: "eraser", icon: <Eraser size={18} />, label: "Eraser" },
  { id: "neon", icon: <Zap size={18} />, label: "Neon" },
  { id: "highlighter", icon: <Highlighter size={18} />, label: "Highlighter" },
  { id: "arrow", icon: <ArrowRight size={18} />, label: "Arrow" },
];

export default function DrawingToolbar({
  tool,
  brushSize,
  brushOpacity,
  brushColor,
  canUndo,
  canRedo,
  onToolChange,
  onBrushSizeChange,
  onBrushOpacityChange,
  onBrushColorChange,
  onUndo,
  onRedo,
  onClear,
  onClose,
}: DrawingToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 py-2 backdrop-blur-xl border-t border-white/10 bg-black/40">
      <div className="max-w-screen-xl mx-auto flex flex-col gap-3">
        {/* Main toolbar */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-black/60 border border-white/10 overflow-x-auto">
          {/* Tool buttons */}
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => onToolChange(t.id)}
              className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                tool === t.id
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />

          {/* Undo/Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              canUndo
                ? "text-white/60 hover:text-white hover:bg-white/10"
                : "text-white/30 cursor-not-allowed"
            }`}
            title="Undo"
          >
            <RotateCcw size={18} />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              canRedo
                ? "text-white/60 hover:text-white hover:bg-white/10"
                : "text-white/30 cursor-not-allowed"
            }`}
            title="Redo"
          >
            <RotateCw size={18} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />

          {/* Clear */}
          <button
            onClick={onClear}
            className="p-2 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
            title="Clear"
          >
            <Trash2 size={18} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings panels */}
        {tool !== "none" && (
          <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-xl bg-black/60 border border-white/10">
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
                Color
              </span>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => onBrushColorChange(e.target.value)}
                className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0"
              />
            </div>

            <div className="w-px h-4 bg-white/10" />

            {/* Brush size */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
                Size
              </span>
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                className="w-24 h-1.5 rounded-full cursor-pointer accent-white/50"
              />
              <span className="text-[11px] text-white/50 w-6 text-right">
                {brushSize}
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            {/* Opacity */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
                Opacity
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(brushOpacity * 100)}
                onChange={(e) =>
                  onBrushOpacityChange(Number(e.target.value) / 100)
                }
                className="w-24 h-1.5 rounded-full cursor-pointer accent-white/50"
              />
              <span className="text-[11px] text-white/50 w-8 text-right">
                {Math.round(brushOpacity * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
