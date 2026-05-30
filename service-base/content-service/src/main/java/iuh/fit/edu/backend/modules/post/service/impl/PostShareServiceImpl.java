package iuh.fit.edu.backend.modules.post.service.impl;

import iuh.fit.edu.backend.modules.post.constant.PrivacyType;
import iuh.fit.edu.backend.modules.post.constant.StatusType;
import iuh.fit.edu.backend.modules.post.entity.PostShare;
import iuh.fit.edu.backend.modules.post.repository.PostShareRepository;
import iuh.fit.edu.backend.modules.post.repository.PostRepository;
import iuh.fit.edu.backend.modules.post.service.PostShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostShareServiceImpl implements PostShareService {

    private final PostShareRepository postShareRepository;
    private final PostRepository postRepository;

    @Override
    public PostShare sharePost(String userId, String postId, String content) {
        log.info("User {} sharing post {}", userId, postId);

        // 🔒 Validate allowShares for the post
        postRepository.findById(postId).ifPresent(post -> {
            if (!post.isAllowShares()) {
                log.warn("Share rejected: Post {} has sharing disabled", postId);
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Sharing is disabled for this post"
                );
            }
        });
        
        PostShare share = PostShare.builder()
                .originalPostId(postId)
                .sharedByUserId(userId)
                .content(content)
                .privacy(PrivacyType.PUBLIC)
                .status(StatusType.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
                
        return postShareRepository.save(share);
    }

    @Override
    public List<PostShare> getSharedPostsByUserId(String userId) {
        return postShareRepository.findBySharedByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public void deleteShare(String shareId, String userId) {
        postShareRepository.findById(shareId).ifPresent(share -> {
            if (share.getSharedByUserId().equals(userId)) {
                postShareRepository.delete(share);
            }
        });
    }
}
