/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.conversation.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import iuh.fit.edu.backend.modules.conversation.constant.ConversationMemberStatus;
import iuh.fit.edu.backend.modules.conversation.constant.MemberRole;
import lombok.*;

import java.time.Instant;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Data
public class ConversationMemberResponse {
    private Long id;
    private Long userId;
    private String nickname; // Tên trong nhóm
    private String avatar;
    private int unreadCount;
    private Instant clearedAt;
    private String lastReadMessageId; // Mốc tin nhắn đã đọc (watermark)

    private MemberRole role;
    private ConversationMemberStatus status;
    private Instant joinedAt;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Instant leftAt;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Instant blockedAt;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long blockedById;

}
