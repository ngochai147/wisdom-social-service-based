package iuh.fit.edu.backend.modules.notification.constant;

public enum NotificationType {
    // Reaction notifications
    REACTION_POST,
    REACTION_COMMENT,
    REACTION_STORY,
    REACTION_NOTE,

    // Comment notifications
    COMMENT_POST,
    COMMENT_MENTION,
    REPLY_COMMENT,

    // Share notifications
    SHARE_POST,

    // Friend notifications
    FRIEND_REQUEST,
    FRIEND_ACCEPT,

    // Tag notifications
    TAG_POST,
    TAG_COMMENT,
    TAG_STORY,

    // Story notifications
    STORY_MENTION,
    STORY_REPLY,

    // Group notifications
    GROUP_INVITE,
    GROUP_POST,
    GROUP_MENTION,

    // System notifications
    SYSTEM_ANNOUNCEMENT,
    BIRTHDAY_REMINDER,
    MEMORY_REMINDER
}