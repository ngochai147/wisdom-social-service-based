/*
 * @ (#) .java    1.0       
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.conversation.dto.response;

import iuh.fit.edu.backend.modules.conversation.constant.ConversationType;
import iuh.fit.edu.backend.modules.chat.dto.response.LastMessageResponse;
import lombok.Data;

import java.time.Instant;

/*
 * @description
 * @author: Huu Thai
 * @date:   
 * @version: 1.0
 */
@Data
public class ConversationSidebarResponse {
    private Long id;
    private String name;
    private ConversationType type;
    private String imageUrl;
    private Long directPartnerId;
    private Instant updatedAt;
    private int unreadCount;
    private LastMessageResponse lastMessage;
}
