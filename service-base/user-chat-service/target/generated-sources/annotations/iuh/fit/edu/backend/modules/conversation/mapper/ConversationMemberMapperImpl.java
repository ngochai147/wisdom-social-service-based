package iuh.fit.edu.backend.modules.conversation.mapper;

import iuh.fit.edu.backend.modules.conversation.dto.response.ConversationMemberResponse;
import iuh.fit.edu.backend.modules.conversation.entity.ConversationMember;
import iuh.fit.edu.backend.modules.user.entity.User;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-05-30T20:42:12+0700",
    comments = "version: 1.6.3, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class ConversationMemberMapperImpl extends ConversationMemberMapper {

    @Override
    public ConversationMemberResponse toConversationMemberResponse(ConversationMember conversationMember) {
        if ( conversationMember == null ) {
            return null;
        }

        ConversationMemberResponse conversationMemberResponse = new ConversationMemberResponse();

        conversationMemberResponse.setUserId( conversationMemberUserId( conversationMember ) );
        conversationMemberResponse.setBlockedById( conversationMemberBlockedById( conversationMember ) );
        conversationMemberResponse.setAvatar( buildAvatarUrl( conversationMemberUserAvatarUrl( conversationMember ) ) );
        conversationMemberResponse.setLastReadMessageId( conversationMember.getLastReadMessageId() );
        conversationMemberResponse.setBlockedAt( conversationMember.getBlockedAt() );
        conversationMemberResponse.setClearedAt( conversationMember.getClearedAt() );
        conversationMemberResponse.setId( conversationMember.getId() );
        conversationMemberResponse.setJoinedAt( conversationMember.getJoinedAt() );
        conversationMemberResponse.setLeftAt( conversationMember.getLeftAt() );
        conversationMemberResponse.setRole( conversationMember.getRole() );
        conversationMemberResponse.setStatus( conversationMember.getStatus() );
        conversationMemberResponse.setUnreadCount( conversationMember.getUnreadCount() );

        conversationMemberResponse.setNickname( conversationMember.getNickname() != null ? conversationMember.getNickname() : conversationMember.getUser().getName() );

        return conversationMemberResponse;
    }

    @Override
    public List<ConversationMemberResponse> toListConversationMemberResponse(List<ConversationMember> conversationMembers) {
        if ( conversationMembers == null ) {
            return null;
        }

        List<ConversationMemberResponse> list = new ArrayList<ConversationMemberResponse>( conversationMembers.size() );
        for ( ConversationMember conversationMember : conversationMembers ) {
            list.add( toConversationMemberResponse( conversationMember ) );
        }

        return list;
    }

    private Long conversationMemberUserId(ConversationMember conversationMember) {
        User user = conversationMember.getUser();
        if ( user == null ) {
            return null;
        }
        return user.getId();
    }

    private Long conversationMemberBlockedById(ConversationMember conversationMember) {
        User blockedBy = conversationMember.getBlockedBy();
        if ( blockedBy == null ) {
            return null;
        }
        return blockedBy.getId();
    }

    private String conversationMemberUserAvatarUrl(ConversationMember conversationMember) {
        User user = conversationMember.getUser();
        if ( user == null ) {
            return null;
        }
        return user.getAvatarUrl();
    }
}
