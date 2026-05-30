/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.conversation.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import iuh.fit.edu.backend.modules.conversation.constant.ConversationType;
import iuh.fit.edu.backend.modules.conversation.entity.PinnedMessageDetail;
import iuh.fit.edu.backend.modules.conversation.dto.response.ConversationMemberResponse;
import iuh.fit.edu.backend.modules.chat.dto.response.LastMessageResponse;
import lombok.Data;

import java.time.Instant;
import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Data
public class ConversationResponse {
    private Long id;
    private String name;
    private ConversationType type;
    private String imageUrl;
    private Instant updatedAt;
    private int unreadCount;
    private LastMessageResponse lastMessage;
    @JsonProperty("isMessageRestricted")
    private boolean isMessageRestricted;
    @JsonProperty("isJoinApprovalRequired")
    private boolean isJoinApprovalRequired;
     private String inviteToken;
    private List<ConversationMemberResponse> members;
    private List<PinnedMessageDetail> pinnedMessages;
    private List<JoinRequestResponse> pendingRequests;
}

