package iuh.fit.edu.backend.modules.chat.mapper;

import iuh.fit.edu.backend.modules.chat.dto.response.MessageResponse;
import iuh.fit.edu.backend.modules.chat.entity.Message;
import java.util.LinkedHashSet;
import java.util.Set;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-05-30T20:42:13+0700",
    comments = "version: 1.6.3, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class MessageMapperImpl extends MessageMapper {

    @Override
    public MessageResponse toMessageResponse(Message message) {
        if ( message == null ) {
            return null;
        }

        MessageResponse messageResponse = new MessageResponse();

        messageResponse.setType( message.getMessageType() );
        messageResponse.setAttachments( mapAttachments( message.getAttachments() ) );
        messageResponse.setClientMessageId( message.getClientMessageId() );
        messageResponse.setContent( message.getContent() );
        messageResponse.setConversationId( message.getConversationId() );
        messageResponse.setCreatedAt( message.getCreatedAt() );
        Set<Long> set = message.getDeletedFor();
        if ( set != null ) {
            messageResponse.setDeletedFor( new LinkedHashSet<Long>( set ) );
        }
        messageResponse.setIconName( mapIconName( message.getIconName() ) );
        messageResponse.setId( message.getId() );
        messageResponse.setPollId( message.getPollId() );
        messageResponse.setRecalled( message.isRecalled() );
        messageResponse.setReplyInfo( mapReplyInfo( message.getReplyInfo() ) );
        messageResponse.setSenderId( message.getSenderId() );

        customizeContent( message, messageResponse );

        return messageResponse;
    }
}
