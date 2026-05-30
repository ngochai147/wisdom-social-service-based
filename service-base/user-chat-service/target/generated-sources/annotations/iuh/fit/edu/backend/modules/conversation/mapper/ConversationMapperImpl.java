package iuh.fit.edu.backend.modules.conversation.mapper;

import iuh.fit.edu.backend.modules.chat.dto.response.LastMessageResponse;
import iuh.fit.edu.backend.modules.conversation.constant.ConversationType;
import iuh.fit.edu.backend.modules.conversation.dto.response.ConversationResponse;
import iuh.fit.edu.backend.modules.conversation.dto.response.ConversationSidebarResponse;
import iuh.fit.edu.backend.modules.conversation.entity.Conversation;
import iuh.fit.edu.backend.modules.conversation.entity.ConversationMember;
import iuh.fit.edu.backend.modules.conversation.entity.PinnedMessageDetail;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-05-30T20:42:12+0700",
    comments = "version: 1.6.3, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class ConversationMapperImpl extends ConversationMapper {

    @Autowired
    private ConversationMemberMapper conversationMemberMapper;

    @Override
    public ConversationResponse toConversationResponse(Conversation conversation, Long userId) {
        if ( conversation == null ) {
            return null;
        }

        ConversationResponse conversationResponse = new ConversationResponse();

        conversationResponse.setMembers( conversationMemberMapper.toListConversationMemberResponse( conversation.getMembers() ) );
        List<PinnedMessageDetail> list1 = conversation.getPinnedMessages();
        if ( list1 != null ) {
            conversationResponse.setPinnedMessages( new ArrayList<PinnedMessageDetail>( list1 ) );
        }
        conversationResponse.setLastMessage( toLastMessageResponse( conversation ) );
        conversationResponse.setImageUrl( buildImageUrl( conversation.getImageUrl() ) );
        conversationResponse.setId( conversation.getId() );
        conversationResponse.setInviteToken( conversation.getInviteToken() );
        conversationResponse.setJoinApprovalRequired( conversation.isJoinApprovalRequired() );
        conversationResponse.setMessageRestricted( conversation.isMessageRestricted() );
        conversationResponse.setName( conversation.getName() );
        conversationResponse.setType( conversation.getType() );
        conversationResponse.setUpdatedAt( conversation.getUpdatedAt() );

        applyCorrectLastMessageToDetail( conversation, conversationResponse, userId );
        customizeDirectChatDetailInfo( conversation, conversationResponse, userId );
        mapUnreadCount( conversation, conversationResponse, userId );
        mapPinnedMessages( conversation, conversationResponse );

        return conversationResponse;
    }

    @Override
    public List<ConversationResponse> toListConversationResponse(List<Conversation> conversations, Long userId) {
        if ( conversations == null ) {
            return null;
        }

        List<ConversationResponse> list = new ArrayList<ConversationResponse>( conversations.size() );
        for ( Conversation conversation : conversations ) {
            list.add( toConversationResponse( conversation, userId ) );
        }

        return list;
    }

    @Override
    public ConversationSidebarResponse toSidebarFromMember(ConversationMember member) {
        if ( member == null ) {
            return null;
        }

        ConversationSidebarResponse conversationSidebarResponse = new ConversationSidebarResponse();

        conversationSidebarResponse.setId( memberConversationId( member ) );
        conversationSidebarResponse.setName( memberConversationName( member ) );
        conversationSidebarResponse.setType( memberConversationType( member ) );
        conversationSidebarResponse.setImageUrl( buildImageUrl( memberConversationImageUrl( member ) ) );
        conversationSidebarResponse.setUpdatedAt( memberConversationUpdatedAt( member ) );
        conversationSidebarResponse.setUnreadCount( member.getUnreadCount() );

        applyCorrectLastMessageToSidebar( member, conversationSidebarResponse );
        customizeDirectChatInfo( member, conversationSidebarResponse );

        return conversationSidebarResponse;
    }

    @Override
    public List<ConversationSidebarResponse> toListSidebarFromMembers(List<ConversationMember> members) {
        if ( members == null ) {
            return null;
        }

        List<ConversationSidebarResponse> list = new ArrayList<ConversationSidebarResponse>( members.size() );
        for ( ConversationMember conversationMember : members ) {
            list.add( toSidebarFromMember( conversationMember ) );
        }

        return list;
    }

    @Override
    public LastMessageResponse toLastMessageResponse(Conversation conversation) {
        if ( conversation == null ) {
            return null;
        }

        LastMessageResponse lastMessageResponse = new LastMessageResponse();

        lastMessageResponse.setLastMessageContent( conversation.getLastMessageContent() );
        lastMessageResponse.setLastMessageType( conversation.getLastMessageType() );
        lastMessageResponse.setLastMessageAt( conversation.getLastMessageAt() );
        lastMessageResponse.setLastSenderId( conversation.getLastSenderId() );
        lastMessageResponse.setLastSenderName( conversation.getLastSenderName() );

        return lastMessageResponse;
    }

    private Long memberConversationId(ConversationMember conversationMember) {
        Conversation conversation = conversationMember.getConversation();
        if ( conversation == null ) {
            return null;
        }
        return conversation.getId();
    }

    private String memberConversationName(ConversationMember conversationMember) {
        Conversation conversation = conversationMember.getConversation();
        if ( conversation == null ) {
            return null;
        }
        return conversation.getName();
    }

    private ConversationType memberConversationType(ConversationMember conversationMember) {
        Conversation conversation = conversationMember.getConversation();
        if ( conversation == null ) {
            return null;
        }
        return conversation.getType();
    }

    private String memberConversationImageUrl(ConversationMember conversationMember) {
        Conversation conversation = conversationMember.getConversation();
        if ( conversation == null ) {
            return null;
        }
        return conversation.getImageUrl();
    }

    private Instant memberConversationUpdatedAt(ConversationMember conversationMember) {
        Conversation conversation = conversationMember.getConversation();
        if ( conversation == null ) {
            return null;
        }
        return conversation.getUpdatedAt();
    }
}
