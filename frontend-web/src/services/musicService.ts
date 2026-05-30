import axiosClient from "../api/axiosClient";
import { buildS3Url } from "../utils/s3";

export interface MusicMetadata {
    id: string;
    title: string;
    artist: string;
    duration: number; // seconds
    imageUrl: string; 
    audioUrl: string;
    createdAt: string;
}

interface MusicPage {
    content: MusicMetadata[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
}

interface ApiResponse<T> {
    status: number;
    success: boolean;
    message: string;
    data: T;
}

/**
 * Fetch all music tracks with pagination
 * @param page page number (0-indexed)
 * @param size page size (default: 20)
 */
export const getAllMusic = async (
    page: number = 0,
    size: number = 20
): Promise<MusicMetadata[]> => {
    try {
        const res = await axiosClient.get<ApiResponse<MusicPage>>(
            `/music?page=${page}&size=${size}`
        );
        return res.data.data.content || [];
    } catch (error) {
        console.error("Error fetching music:", error);
        return [];
    }
};

/**
 * Search music by title
 * @param title search term
 */
export const searchMusicByTitle = async (
    title: string
): Promise<MusicMetadata[]> => {
    if (!title.trim()) return [];
    try {
        const res = await axiosClient.get<ApiResponse<MusicMetadata[]>>(
            `/music/search/title?title=${encodeURIComponent(title)}`
        );
        return res.data.data || [];
    } catch (error) {
        console.error("Error searching music by title:", error);
        return [];
    }
};

/**
 * Search music by artist
 * @param artist search term
 */
export const searchMusicByArtist = async (
    artist: string
): Promise<MusicMetadata[]> => {
    if (!artist.trim()) return [];
    try {
        const res = await axiosClient.get<ApiResponse<MusicMetadata[]>>(
            `/music/search/artist?artist=${encodeURIComponent(artist)}`
        );
        return res.data.data || [];
    } catch (error) {
        console.error("Error searching music by artist:", error);
        return [];
    }
};

/**
 * Get music by ID
 * @param musicId music ID
 */
export const getMusicById = async (musicId: string): Promise<MusicMetadata | null> => {
    try {
        const res = await axiosClient.get<ApiResponse<MusicMetadata>>(
            `/music/${musicId}`
        );
        return res.data.data || null;
    } catch (error) {
        console.error("Error fetching music by id:", error);
        return null;
    }
};

/**
 * Format duration from seconds to MM:SS
 */
export const formatDuration = (seconds: number): string => {
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Resolve music media path/object key to a fully-qualified URL.
 * Supports already-qualified URLs and raw S3 object keys.
 */
export const resolveMusicMediaUrl = (
    mediaPath: string | null | undefined
): string => {
    return buildS3Url(mediaPath) || "";
};

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
const listeners = new Set<(url: string | null) => void>();

/**
 * Subscribe to playback state changes.
 */
export const subscribeToPlayback = (callback: (url: string | null) => void) => {
    listeners.add(callback);
    return () => {
        listeners.delete(callback);
    };
};

const notifyListeners = () => {
    listeners.forEach((cb) => cb(currentUrl));
};

/**
 * Stop current preview audio if any.
 */
export const stopAudioPreview = (): void => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = ""; // Clear source to stop buffering
        currentAudio = null;
        currentUrl = null;
        notifyListeners();
    }
};

/**
 * Create and play a preview audio instance.
 * Returns the created audio element so caller can keep track of it.
 */
export const playAudioPreview = (
    url: string,
    options?: {
        onEnded?: () => void;
        onTimeUpdate?: (audio: HTMLAudioElement) => void;
        onLoadedMetadata?: (audio: HTMLAudioElement) => void;
    }
): HTMLAudioElement | null => {
    if (!url) return null;

    // Stop existing audio if any
    stopAudioPreview();

    const audio = new Audio(url);
    currentAudio = audio;
    currentUrl = url;
    notifyListeners();

    if (options?.onEnded) {
        audio.onended = () => {
            options.onEnded?.();
            if (currentAudio === audio) {
                currentAudio = null;
                currentUrl = null;
                notifyListeners();
            }
        };
    }
    if (options?.onTimeUpdate) {
        audio.ontimeupdate = () => options.onTimeUpdate?.(audio);
    }
    if (options?.onLoadedMetadata) {
        audio.onloadedmetadata = () => options.onLoadedMetadata?.(audio);
    }

    audio.play().catch((err) => {
        console.error("Error playing audio:", err);
        if (currentAudio === audio) currentAudio = null;
    });

    return audio;
};
