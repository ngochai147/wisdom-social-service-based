package iuh.fit.edu.backend.modules.post.repository;

import iuh.fit.edu.backend.modules.post.entity.Post;

import java.time.Instant;
import java.util.List;

public interface PostFeedRepositoryCustom {

    List<Post> findRecentFriendPosts(
            List<String> friendIds,
            String currentUserId,
            Instant lastRankingTime,
            String lastPostId,
        Instant recentThreshold,
        int size
    );

    List<Post> findRandomFallbackPosts(
        List<String> friendIds,
        String currentUserId,
        Instant lastRankingTime,
        String lastPostId,
        Instant olderThan,
        List<String> excludePostIds,
            int size
    );

    List<Post> findProfilePosts(
            String targetUserId,
            String currentUserId,
            List<String> friendIds,
            int page,
            int size
    );

    long countProfilePosts(
            String targetUserId,
            String currentUserId,
            List<String> friendIds
    );
    List<Post> findActiveSelfPosts(
            String userId,
            Instant recentThreshold,
            int size
    );

    List<Post> findPostsByHashtag(
            String hashtag,
            String currentUserId,
            List<String> friendIds,
            int page,
            int size
    );

    long countPostsByHashtag(
            String hashtag,
            String currentUserId,
            List<String> friendIds
    );
}
