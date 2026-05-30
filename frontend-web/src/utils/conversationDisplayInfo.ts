import type { Conversation, ConversationMember } from "../services/chatService";

interface MemberLike {
    userId: number;
    nickname?: string;
    username?: string;
    avatar?: string;
    status?: ConversationMember["status"];
}

export interface ConversationDisplayInfo {
    name: string;
    avatarUrl: string | null;
    compositeAvatarUrls: string[];
}

interface BuildConversationDisplayInfoParams {
    conversation: Conversation;
    currentUserId: number;
    members?: MemberLike[];
}

const GROUP_NAME_FALLBACK = "Group Chat";
const DIRECT_NAME_FALLBACK = "Unknown";
const MAX_COMPOSITE_AVATARS = 4;

function isActiveMember(member: MemberLike): boolean {
    return !member.status || member.status === "ACTIVE";
}

function normalizeMembers(
    conversation: Conversation,
    members?: MemberLike[],
): MemberLike[] {
    const fromParams = Array.isArray(members)
        ? members.filter((member) => Number.isFinite(member.userId))
        : [];

    if (fromParams.length > 0) {
        return fromParams;
    }

    return (conversation.members ?? [])
        .filter((member) => Number.isFinite(member.userId))
        .map((member) => ({
            userId: member.userId,
            nickname: member.nickname,
            username: member.username,
            avatar: member.avatar,
            status: member.status,
        }));
}

function resolveMemberDisplayName(member: MemberLike): string {
    const nickname = member.nickname?.trim();
    if (nickname) return nickname;

    const username = member.username?.trim();
    if (username) return username;

    return `Người dùng ${member.userId}`;
}

function buildGroupDisplayName(members: MemberLike[]): string {
    const activeMembers = members.filter(isActiveMember);
    const names: string[] = [];
    const seen = new Set<string>();

    for (const member of activeMembers) {
        const label = resolveMemberDisplayName(member);
        if (!label || seen.has(label)) continue;
        seen.add(label);
        names.push(label);
    }

    if (names.length === 0) return GROUP_NAME_FALLBACK;
    return names.join(", ");
}

function buildGroupCompositeAvatars(members: MemberLike[]): string[] {
    const activeMembers = members.filter(isActiveMember);
    const avatars: string[] = [];
    const seen = new Set<string>();

    for (const member of activeMembers) {
        const avatar = member.avatar?.trim();
        if (!avatar || seen.has(avatar)) continue;
        seen.add(avatar);
        avatars.push(avatar);
        if (avatars.length >= MAX_COMPOSITE_AVATARS) break;
    }

    return avatars;
}

export function buildConversationDisplayInfo({
    conversation,
    currentUserId,
    members,
}: BuildConversationDisplayInfoParams): ConversationDisplayInfo {
    const normalizedMembers = normalizeMembers(conversation, members);

    if (conversation.type === "GROUP") {
        const explicitGroupName = conversation.name?.trim();
        const name = explicitGroupName || buildGroupDisplayName(normalizedMembers);

        const explicitAvatarUrl = conversation.imageUrl?.trim() || null;
        const compositeAvatarUrls = explicitAvatarUrl
            ? []
            : buildGroupCompositeAvatars(normalizedMembers);

        return {
            name,
            avatarUrl: explicitAvatarUrl,
            compositeAvatarUrls,
        };
    }

    const otherMember = normalizedMembers.find(
        (member) => member.userId !== currentUserId,
    );
    const explicitDirectName = conversation.name?.trim();
    const explicitDirectAvatarUrl = conversation.imageUrl?.trim();

    return {
        name: otherMember
            ? resolveMemberDisplayName(otherMember)
            : explicitDirectName || DIRECT_NAME_FALLBACK,
        avatarUrl: otherMember?.avatar?.trim() || explicitDirectAvatarUrl || null,
        compositeAvatarUrls: [],
    };
}
