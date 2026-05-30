import { useState, useCallback } from "react";
import type { MusicMetadata } from "../services/musicService";

export type MusicStickerStyle = "compact" | "rectangle" | "square" | "vinyl" | "hidden";

export interface MusicStickerState {
  id: string;
  music: MusicMetadata;
  style: MusicStickerStyle;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  isPlaying: boolean;
  zIndex: number;
}

export function useStoryMusicSticker() {
  const [sticker, setSticker] = useState<MusicStickerState | null>(null);
  const [isSelected, setIsSelected] = useState(false);

  const addSticker = useCallback((music: MusicMetadata) => {
    setSticker({
      id: `music_${Date.now()}`,
      music,
      style: "rectangle",
      x: 50,
      y: 75,
      scale: 1,
      rotation: 0,
      isPlaying: true,
      zIndex: 100,
    });
    setIsSelected(true);
  }, []);

  const updateSticker = useCallback((updates: Partial<MusicStickerState>) => {
    setSticker((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const removeSticker = useCallback(() => {
    setSticker(null);
    setIsSelected(false);
  }, []);

  const cycleStyle = useCallback(() => {
    setSticker((prev) => {
      if (!prev) return null;
      const styles: MusicStickerStyle[] = [
        "compact",
        "rectangle",
        "square",
        "vinyl",
        "hidden",
      ];
      const idx = styles.indexOf(prev.style);
      return { ...prev, style: styles[(idx + 1) % styles.length] };
    });
  }, []);

  const selectSticker = useCallback(() => setIsSelected(true), []);
  const deselectSticker = useCallback(() => setIsSelected(false), []);

  return {
    sticker,
    isSelected,
    addSticker,
    updateSticker,
    removeSticker,
    cycleStyle,
    selectSticker,
    deselectSticker,
  };
}

export type StoryMusicManager = ReturnType<typeof useStoryMusicSticker>;
