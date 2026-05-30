package iuh.fit.edu.backend.modules.post.repository;

import iuh.fit.edu.backend.modules.post.constant.PrivacyType;
import iuh.fit.edu.backend.modules.post.constant.StatusType;
import iuh.fit.edu.backend.modules.post.entity.Post;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class PostFeedRepositoryCustomImpl implements PostFeedRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    @Override
        public List<Post> findRecentFriendPosts(
            List<String> friendIds,
            String currentUserId,
            Instant lastRankingTime,
            String lastPostId,
                        Instant recentThreshold,
            int size
    ) {
        List<Criteria> andCriteria = new ArrayList<>();

                if (friendIds == null || friendIds.isEmpty()) {
                        return List.of();
                }

                andCriteria.add(Criteria.where("authorId").in(friendIds));
        andCriteria.add(Criteria.where("status").is(StatusType.ACTIVE));
        andCriteria.add(Criteria.where("rankingTime").gte(recentThreshold));

        andCriteria.add(buildPrivacyCriteria(currentUserId, friendIds));
        andCriteria.add(buildCursorCriteria(lastRankingTime, lastPostId));

        Query query = new Query(new Criteria().andOperator(andCriteria));
        query.with(Sort.by(Sort.Order.desc("rankingTime"), Sort.Order.desc("_id")));
        query.limit(size);

        return mongoTemplate.find(query, Post.class);
    }

    @Override
    public List<Post> findActiveSelfPosts(
            String userId,
            Instant recentThreshold,
            int size
    ) {
        List<Criteria> andCriteria = new ArrayList<>();
        andCriteria.add(Criteria.where("authorId").is(userId));
        andCriteria.add(Criteria.where("status").is(StatusType.ACTIVE));
        // Only include recently CREATED self-posts.
        // We do not want other users' interactions to bump self-posts back into the feed forever.
        // "Nhìn 1 lần thôi chứ" - meaning self posts should naturally fade out based on creation time,
        // rather than persisting due to lastActivityAt updates.
        andCriteria.add(Criteria.where("createdAt").gte(recentThreshold));

        Query query = new Query(new Criteria().andOperator(andCriteria));
        query.with(Sort.by(Sort.Order.desc("createdAt")));
        query.limit(size);

        return mongoTemplate.find(query, Post.class);
    }

    @Override
    public List<Post> findRandomFallbackPosts(
            List<String> friendIds,
            String currentUserId,
            Instant lastRankingTime,
            String lastPostId,
            Instant olderThan,
            List<String> excludePostIds,
            int size
    ) {
        if (size <= 0) {
            return List.of();
        }

        List<Criteria> andCriteria = new ArrayList<>();
        andCriteria.add(Criteria.where("status").is(StatusType.ACTIVE));
        andCriteria.add(Criteria.where("rankingTime").lt(olderThan));
        andCriteria.add(Criteria.where("authorId").ne(currentUserId));
        andCriteria.add(buildPrivacyCriteria(currentUserId, friendIds));
        andCriteria.add(buildCursorCriteria(lastRankingTime, lastPostId));

        if (excludePostIds != null && !excludePostIds.isEmpty()) {
            andCriteria.add(Criteria.where("_id").nin(excludePostIds));
        }

        Criteria matchCriteria = new Criteria().andOperator(andCriteria);

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(matchCriteria),
                Aggregation.sample(size)
        );

        AggregationResults<Post> aggregationResults = mongoTemplate.aggregate(
                aggregation,
                mongoTemplate.getCollectionName(Post.class),
                Post.class
        );

        return aggregationResults.getMappedResults();
        }
    
    @Override
    public List<Post> findProfilePosts(
            String targetUserId,
            String currentUserId,
            List<String> friendIds,
            int page,
            int size
    ) {
        List<Criteria> andCriteria = new ArrayList<>();
        andCriteria.add(Criteria.where("authorId").is(targetUserId));
        andCriteria.add(Criteria.where("status").is(StatusType.ACTIVE));
        andCriteria.add(buildPrivacyCriteria(currentUserId, friendIds));

        Query query = new Query(new Criteria().andOperator(andCriteria));
        query.with(Sort.by(Sort.Order.desc("createdAt")));
        query.skip((long) page * size);
        query.limit(size);

        return mongoTemplate.find(query, Post.class);
    }

    @Override
    public long countProfilePosts(
            String targetUserId,
            String currentUserId,
            List<String> friendIds
    ) {
        List<Criteria> andCriteria = new ArrayList<>();
        andCriteria.add(Criteria.where("authorId").is(targetUserId));
        andCriteria.add(Criteria.where("status").is(StatusType.ACTIVE));
        andCriteria.add(buildPrivacyCriteria(currentUserId, friendIds));

        Query query = new Query(new Criteria().andOperator(andCriteria));
        return mongoTemplate.count(query, Post.class);
    }

    private Criteria buildPrivacyCriteria(String currentUserId, List<String> friendIds) {
        Criteria ownPost = Criteria.where("authorId").is(currentUserId);

        Criteria publicPost = Criteria.where("privacy").is(PrivacyType.PUBLIC);

        Criteria friendsPost = new Criteria().andOperator(
                Criteria.where("privacy").is(PrivacyType.FRIENDS),
                Criteria.where("authorId").in(friendIds)
        );

        Criteria specificPost = new Criteria().andOperator(
                Criteria.where("privacy").is(PrivacyType.SPECIFIC),
                Criteria.where("specificViewerUserIds").in(currentUserId)
        );

        Criteria exceptPost = new Criteria().andOperator(
                Criteria.where("privacy").is(PrivacyType.EXCEPT),
                new Criteria().orOperator(
                        Criteria.where("excludedUserIds").exists(false),
                        Criteria.where("excludedUserIds").size(0),
                        Criteria.where("excludedUserIds").nin(currentUserId)
                )
        );

        // In this codebase ONLY_ME is equivalent to PRIVATE.
        Criteria onlyMePost = new Criteria().andOperator(
                Criteria.where("privacy").is(PrivacyType.ONLY_ME),
                Criteria.where("authorId").is(currentUserId)
        );

        return new Criteria().orOperator(
                ownPost,
                publicPost,
                friendsPost,
                specificPost,
                exceptPost,
                onlyMePost
        );
    }

    private Criteria buildCursorCriteria(Instant lastRankingTime, String lastPostId) {
        if (lastRankingTime == null) {
            return new Criteria();
        }

        if (lastPostId == null || lastPostId.isBlank()) {
            return Criteria.where("rankingTime").lt(lastRankingTime);
        }

        return new Criteria().orOperator(
                Criteria.where("rankingTime").lt(lastRankingTime),
                new Criteria().andOperator(
                        Criteria.where("rankingTime").is(lastRankingTime),
                        Criteria.where("_id").lt(lastPostId)
                )
        );
    }

    @Override
    public List<Post> findPostsByHashtag(
            String hashtag,
            String currentUserId,
            List<String> friendIds,
            int page,
            int size
    ) {
        List<Criteria> andCriteria = new ArrayList<>();
        // Compare with lowercase for case-insensitivity consistency
        andCriteria.add(Criteria.where("hashtags").is(hashtag.trim().toLowerCase()));
        andCriteria.add(Criteria.where("status").is(StatusType.ACTIVE));
        andCriteria.add(buildPrivacyCriteria(currentUserId, friendIds));

        Query query = new Query(new Criteria().andOperator(andCriteria));
        query.with(Sort.by(Sort.Order.desc("createdAt")));
        query.skip((long) page * size);
        query.limit(size);

        return mongoTemplate.find(query, Post.class);
    }

    @Override
    public long countPostsByHashtag(
            String hashtag,
            String currentUserId,
            List<String> friendIds
    ) {
        List<Criteria> andCriteria = new ArrayList<>();
        andCriteria.add(Criteria.where("hashtags").is(hashtag.trim().toLowerCase()));
        andCriteria.add(Criteria.where("status").is(StatusType.ACTIVE));
        andCriteria.add(buildPrivacyCriteria(currentUserId, friendIds));

        Query query = new Query(new Criteria().andOperator(andCriteria));
        return mongoTemplate.count(query, Post.class);
    }
}
