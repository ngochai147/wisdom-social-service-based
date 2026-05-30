package iuh.fit.edu.backend.modules.post.service.impl;

import iuh.fit.edu.backend.modules.post.dto.response.FeedSliceResponse;
import iuh.fit.edu.backend.modules.post.entity.Post;
import iuh.fit.edu.backend.modules.post.repository.PostRepository;
import iuh.fit.edu.backend.modules.post.service.FeedService;
import iuh.fit.edu.backend.modules.user.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FeedServiceImpl implements FeedService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 200;
    private static final int MAX_FRIEND_RECENT_POSTS = 100;
    private static final int MAX_FEED_AUTHORS = 200;

    private final FriendService friendService;
    private final PostRepository postRepository;

    @Override
    public FeedSliceResponse getFeed(Long userId, Instant lastRankingTime, String lastPostId, int size, String prioritizePostId) {
        int pageSize = normalizePageSize(size);
        Instant recentThreshold = Instant.now().minus(24, ChronoUnit.HOURS);

        String currentUserId = userId.toString();
        List<Long> friendIdsLong = friendService.getAcceptedFriendIds(userId);

        List<String> friendIds = friendIdsLong.stream()
                .map(String::valueOf)
                .limit(MAX_FEED_AUTHORS)
                .toList();

        int friendQueryLimit = Math.min(MAX_FRIEND_RECENT_POSTS + 1, pageSize + 1);
        List<Post> friendRecent = postRepository.findRecentFriendPosts(
                friendIds,
                currentUserId,
                lastRankingTime,
                lastPostId,
                recentThreshold,
                friendQueryLimit
        );

        // Fetch self's "active" posts separately to avoid cluttering with all self posts
        // "Active" = very new (last 2h) or has interactions
        Instant selfActiveThreshold = Instant.now().minus(2, ChronoUnit.HOURS);
        List<Post> selfActive = (lastRankingTime == null) 
            ? postRepository.findActiveSelfPosts(currentUserId, selfActiveThreshold, 10)
            : new ArrayList<>();

        int friendTake = Math.min(friendRecent.size(), Math.min(pageSize, MAX_FRIEND_RECENT_POSTS));
        boolean hasMoreFriendRecent = friendRecent.size() > friendTake;

        List<Post> merged = new ArrayList<>(pageSize + 1);
        Set<String> seenPostIds = new HashSet<>();

        // One-time boost: pin the prioritized post on top only on the first page load.
        Post prioritizedPost = null;
        if (lastRankingTime == null && prioritizePostId != null && !prioritizePostId.isBlank()) {
            prioritizedPost = postRepository.findById(prioritizePostId)
                    .filter(post -> post.getStatus() != null && "ACTIVE".equals(post.getStatus().name()))
                    .orElse(null);
            if (prioritizedPost != null) {
                merged.add(prioritizedPost);
                seenPostIds.add(prioritizedPost.getId());
            }
        }

        if (friendTake > 0) {
            for (Post post : friendRecent.subList(0, friendTake)) {
                if (seenPostIds.add(post.getId())) {
                    merged.add(post);
                }
            }
        }

        // Add self active posts
        for (Post post : selfActive) {
            if (seenPostIds.add(post.getId())) {
                merged.add(post);
            }
        }

        int remaining = pageSize - merged.size();
        boolean hasMoreRandom = false;
        if (remaining > 0) {
            List<Post> randomPosts = postRepository.findRandomFallbackPosts(
                    friendIds,
                    currentUserId,
                    lastRankingTime,
                    lastPostId,
                    recentThreshold,
                    new ArrayList<>(seenPostIds),
                    remaining + 1
            );

            for (Post randomPost : randomPosts) {
                if (merged.size() >= pageSize) {
                    hasMoreRandom = true;
                    break;
                }
                if (seenPostIds.add(randomPost.getId())) {
                    merged.add(randomPost);
                }
            }

            if (!hasMoreRandom) {
                hasMoreRandom = randomPosts.size() > remaining;
            }
        }

        final String pinnedId = prioritizedPost != null ? prioritizedPost.getId() : null;
        merged.sort((a, b) -> {
            if (Objects.equals(a.getId(), pinnedId)) return -1;
            if (Objects.equals(b.getId(), pinnedId)) return 1;
            
            Instant ta = a.getRankingTime();
            Instant tb = b.getRankingTime();
            if (ta == null && tb == null) return Objects.compare(b.getId(), a.getId(), Comparator.nullsLast(Comparator.naturalOrder()));
            if (ta == null) return 1;
            if (tb == null) return -1;
            
            int dateCmp = tb.compareTo(ta);
            if (dateCmp != 0) return dateCmp;
            return Objects.compare(b.getId(), a.getId(), Comparator.nullsLast(Comparator.naturalOrder()));
        });

        if (merged.size() > pageSize) {
            merged = new ArrayList<>(merged.subList(0, pageSize));
        }

        boolean hasNext = hasMoreFriendRecent || hasMoreRandom;

        Instant nextCursorRankingTime = null;
        String nextCursorPostId = null;
        if (hasNext && !merged.isEmpty()) {
            Post lastPost = merged.get(merged.size() - 1);
            nextCursorRankingTime = lastPost.getRankingTime();
            nextCursorPostId = lastPost.getId();
        }

        return FeedSliceResponse.builder()
                .posts(merged)
                .nextCursorCreatedAt(nextCursorRankingTime) // Reusing field for simplicity but populating with rankingTime
                .nextCursorPostId(nextCursorPostId)
                .hasNext(hasNext)
                .build();
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }
}

/*
 * ========================= FEED LOGIC OVERVIEW =========================
 *
 * This feed implementation follows a HYBRID strategy:
 *
 * 1. PRIORITY CONTENT (Friends - Recent 24h)
 * --------------------------------------------------
 * - Fetch posts from user's friends within the last 24 hours
 * - Sorted by createdAt DESC (newest first)
 * - Limit to MAX_FRIEND_RECENT_POSTS (100 posts)
 *
 * Purpose:
 * - Ensure users always see the most relevant and recent content
 * - Avoid missing newly created posts from friends
 *
 *
 * 2. FALLBACK CONTENT (Random Global Posts)
 * --------------------------------------------------
 * - If not enough posts from friends, fill remaining slots
 * - Fetch random posts from ALL users (not limited to friends)
 * - Exclude:
 *      + Already selected posts
 *      + Posts already seen in this page (deduplication)
 * - Can include older posts (>24h)
 *
 * Purpose:
 * - Prevent empty feed
 * - Increase content diversity
 * - Support content discovery (like TikTok/Facebook suggestion)
 *
 *
 * 3. AUTHOR LIMIT OPTIMIZATION
 * --------------------------------------------------
 * - Limit friendIds to MAX_FEED_AUTHORS (200)
 *
 * Purpose:
 * - Avoid large MongoDB `$in` queries (performance bottleneck)
 * - Reduce memory and CPU usage
 *
 *
 * 4. DEDUPLICATION
 * --------------------------------------------------
 * - Use seenPostIds (Set<String>)
 * - Ensure no duplicate posts between:
 *      + friendRecent
 *      + random fallback
 *
 *
 * 5. SORTING STRATEGY
 * --------------------------------------------------
 * - Final merged list is sorted by:
 *      + createdAt DESC
 *      + id DESC (tie-breaker)
 *
 * Purpose:
 * - Maintain consistent ordering
 * - Ensure stable pagination
 *
 *
 * 6. CURSOR-BASED PAGINATION
 * --------------------------------------------------
 * - Use:
 *      + lastCreatedAt
 *      + lastPostId
 * - Fetch pageSize + 1 to determine hasNext
 * - Return:
 *      + nextCursorCreatedAt
 *      + nextCursorPostId
 *
 * Purpose:
 * - Avoid offset pagination (better performance)
 * - Ensure scalability for large datasets
 *
 *
 * 7. HAS NEXT LOGIC
 * --------------------------------------------------
 * - hasNext = hasMoreFriendRecent OR hasMoreRandom
 *
 * Meaning:
 * - There are more posts available from either:
 *      + friend recent posts
 *      + random fallback pool
 *
 *
 * 8. WHY NOT RANDOM FRIENDS?
 * --------------------------------------------------
 * - Randomizing friendIds may cause:
 *      + Missing newly created posts
 *      + Poor user experience
 *
 * Solution:
 * - Prioritize CONTENT (posts), not authors
 *
 *
 * 9. WHY NOT FAN-OUT?
 * --------------------------------------------------
 * - Fan-out increases write complexity significantly
 * - Current system is optimized for:
 *      + Simplicity
 *      + MongoDB query efficiency
 *
 * Suitable for:
 * - Medium-scale systems
 * - Early-stage social platforms
 *
 *
 * 10. DESIGN GOAL
 * --------------------------------------------------
 * Balance between:
 *
 * ✔ Relevance:
 *      - Friends + recent posts (24h)
 *
 * ✔ Discovery:
 *      - Random global posts
 *
 * ✔ Performance:
 *      - Limited authors
 *      - Indexed queries
 *      - Cursor pagination
 *
 *
 * ========================= END OF NOTE =========================
 */
