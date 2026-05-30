import type { NoteMusic } from "./note";

// API Response Types
export interface ApiResponse<T> {
    status: number;
    success: boolean;
    message: string;
    data: T | null;
    errors?: any;
    timestamp: string; // OffsetDateTime -> ISO string
}

// User Types
export interface User {
    id: number;
    username: string;
    fullName: string;
    avatarUrl: string;
    bio?: string;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    name?: string;
    birthday?: string;
    isVerified?: boolean;
    friendsCount?: number;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    // Account deletion (15-day pending wipe)
    deletionRequestedAt?: string | null;
    deletionScheduledFor?: string | null;
    hasPinCode?: boolean;
}

// Post Types
export type PrivacyType = "PUBLIC" | "FRIENDS" | "ONLY_ME" | "SPECIFIC" | "EXCEPT";

export interface Post {
    id: string;
    user: User;
    images: string[];
    media?: Array<{ url: string; type: string; duration?: number; width?: number; height?: number }>;
    caption: string;
    likes: number;
    comments: Comment[];
    createdAt: string;
    lastActivityAt?: string;
    rankingTime?: string;
    isLiked?: boolean;
    isSaved?: boolean;
    privacy?: PrivacyType;
    allowComments?: boolean;
    allowShares?: boolean;
    music?: NoteMusic;
    location?:
        | string
        | {
            name?: string;
            address?: string;
        };
}

export interface Comment {
    id: string;
    user: User;
    text: string;
    createdAt: string;
    likes: number;
}

// Story Types
export interface Story {
    id: string;
    user: User;
    image: string;
    createdAt: string;
    isViewed?: boolean;
}

// Message Types
export interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: string;
    isRead?: boolean;
}

export interface Chat {
    id: string;
    user: User;
    lastMessage: Message;
    unreadCount: number;
}

// Notification Types
export type NotificationType = 
    | 'REACTION_POST' | 'REACTION_COMMENT' | 'REACTION_STORY' | 'REACTION_NOTE'
    | 'COMMENT_POST' | 'COMMENT_MENTION' | 'REPLY_COMMENT'
    | 'SHARE_POST'
    | 'FRIEND_REQUEST' | 'FRIEND_ACCEPT'
    | 'TAG_POST' | 'TAG_COMMENT' | 'TAG_STORY'
    | 'STORY_MENTION' | 'STORY_REPLY'
    | 'GROUP_INVITE' | 'GROUP_POST' | 'GROUP_MENTION'
    | 'SYSTEM_ANNOUNCEMENT' | 'BIRTHDAY_REMINDER' | 'MEMORY_REMINDER';

export type TargetType = 'POST' | 'POST_SHARE' | 'NOTE' | 'STORY' | 'COMMENT';

export interface NotificationMetadata {
    imageUrl?: string;
    count?: number;
    deepLink?: string;
    extraData?: string;
}

export interface Notification {
    id: string;
    recipientId: string;
    actorIds: string[];
    type: NotificationType;
    targetType?: TargetType;
    targetId?: string;
    content?: string;
    metadata?: NotificationMetadata;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
}