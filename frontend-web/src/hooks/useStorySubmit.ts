import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { StoryTextManager } from "./useStoryTextManager";
import type { StoryMusicManager } from "./useStoryMusicSticker";
import {
    uploadStoryMediaAndGetFormat,
    createStory,
} from "../services/storyService";

const BG_GRADIENTS = [
    "bg-gradient-to-br from-purple-600 via-pink-500 to-red-500",
    "bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400",
    "bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300",
    "bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400",
    "bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-400",
    "bg-gradient-to-br from-rose-500 via-red-400 to-orange-400",
    "bg-gradient-to-br from-slate-800 via-gray-700 to-zinc-600",
    "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
    "bg-gradient-to-br from-fuchsia-600 via-violet-500 to-indigo-400",
    "bg-gradient-to-br from-teal-600 via-emerald-400 to-lime-400",
];

interface SubmitParams {
    textManager: StoryTextManager;
    musicManager: StoryMusicManager;
    selectedMedia: File | null;
    privacy: string;
    allowReplies: boolean;
    allowSharing: boolean;
    selectedBgIndex: number;
    muteOriginal?: boolean;
}

export function useStorySubmit() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePost = async (params: SubmitParams) => {
        if (!canSubmit(params)) return;
        setIsSubmitting(true);
        try {
            // ── 1. Build text content from all text layers ──
            const textContent = params.textManager.layers
                .filter((l) => l.text.trim())
                .map((l) => l.text.trim())
                .join("\n");

            // ── 2. Upload media to S3 if present ──
            const mediaUrls: string[] = [];
            if (params.selectedMedia) {
                console.log("📤 Uploading story media...");
                const objectKey = await uploadStoryMediaAndGetFormat(
                    params.selectedMedia
                );
                mediaUrls.push(objectKey);
                console.log("✅ Story media uploaded:", objectKey);
            }

            // ── 3. Build content with metadata ──
            // Include background gradient info for text-only stories
            let fullContent = textContent;
            if (!params.selectedMedia && params.selectedBgIndex >= 0) {
                const bgGradient = BG_GRADIENTS[params.selectedBgIndex];
                if (bgGradient) {
                    fullContent = fullContent
                        ? `${fullContent}\n[bg:${bgGradient}]`
                        : `[bg:${bgGradient}]`;
                }
            }

            // Map privacy to backend enum
            const privacyMap: Record<string, string> = {
                PUBLIC: "PUBLIC",
                FRIENDS: "FRIENDS",
                ONLY_ME: "ONLY_ME",
                SPECIFIC: "SPECIFIC",
                EXCEPT: "EXCEPT",
                // fallback/backwards compatibility
                PRIVATE: "ONLY_ME",
                FRIENDS_EXCEPT: "EXCEPT",
                public: "PUBLIC",
                friends: "FRIENDS",
                private: "ONLY_ME",
                close_friends: "FRIENDS",
            };
            const backendPrivacy =
                privacyMap[params.privacy.toUpperCase()] || "PUBLIC";

            // ── 4. Call backend API to create story ──
            console.log("📝 Creating story...", {
                content: fullContent,
                privacy: backendPrivacy,
                mediaUrls,
                music: params.musicManager.sticker?.music?.title || null,
            });

            await createStory(
                fullContent || undefined,
                backendPrivacy,
                mediaUrls.length > 0 ? mediaUrls : undefined,
                params.musicManager.sticker?.music?.id,
                0, // musicStartTime
                params.muteOriginal
            );

            console.log("✅ Story created successfully!");
            navigate("/");
        } catch (error: any) {
            console.error("❌ Error creating story:", error);
            alert(
                "Không thể tạo tin. Vui lòng thử lại.\n" +
                    (error?.message || "")
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        isSubmitting,
        handlePost,
        canSubmit,
    };
}

function canSubmit(params: SubmitParams): boolean {
    return (
        !params.textManager.layers.every((l) => !l.text.trim()) ||
        params.selectedMedia !== null ||
        params.musicManager.sticker !== null
    );
}
