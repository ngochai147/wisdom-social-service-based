import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import StoriesBar from "../components/story/StoriesBar";
import PostCard from "../components/post/post-card/PostCard";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { fetchHomeFeedPosts, normalizePost } from "../services/homeFeedService";
import useRealtimePosts from "../hooks/useRealtimePosts";
import * as postApi from "../services/postService";
import type { Post } from "../types";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [postsMap, setPostsMap] = useState<Map<string, Post>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived sorted posts for rendering
  const sortedPosts = Array.from(postsMap.values()).sort((a, b) => {
    const da = new Date(a.rankingTime || a.createdAt).getTime();
    const db = new Date(b.rankingTime || b.createdAt).getTime();
    if (isNaN(da) || isNaN(db)) return 0;
    return db - da;
  });

  const handlePostCreated = useCallback(async (newPost: any) => {
    console.log("🔥 WebSocket: NEW_POST received", newPost);
    toast.success("New post created!");
    try {
      const authorData = await postApi.fetchUserById(newPost.authorId);
      const normalized = normalizePost(newPost, authorData);
      setPostsMap((prev) => {
        const next = new Map(prev);
        next.set(normalized.id, normalized);
        return next;
      });
    } catch (err) {
      console.error("Error normalizing created post:", err);
    }
  }, []);

  const handlePostUpdated = useCallback((updatedPost: any) => {
    console.log("🔥 WebSocket: POST_UPDATED received", updatedPost);
    setPostsMap((prev) => {
      const postId = updatedPost.id;
      const existing = prev.get(postId);
      if (!existing) return prev;

      const next = new Map(prev);
      next.set(postId, { ...existing, ...updatedPost });
      return next;
    });
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    console.log("🔥 WebSocket: POST_DELETED received", postId);
    setPostsMap((prev) => {
      if (!prev.has(postId)) return prev;
      const next = new Map(prev);
      next.delete(postId);
      return next;
    });
  }, []);

  const handleActivityBump = useCallback(
    (postId: string, lastActivityAt: string) => {
      console.log("🔥 WebSocket: BUMP received", postId, lastActivityAt);
      setPostsMap((prev) => {
        const existing = prev.get(postId);
        if (!existing) return prev;

        // 🔒 Defensive check: Don't bump if post belongs to current user
        if (currentUser && existing.user.id === currentUser.id) {
          console.log("⏭️ Skipping BUMP for current user's post:", postId);
          return prev;
        }

        // Update both lastActivityAt and rankingTime to temporarily bump it for realtime UX
        const next = new Map(prev);
        const tempRankingTime = new Date().toISOString();
        next.set(postId, { ...existing, lastActivityAt, rankingTime: tempRankingTime });
        return next;
      });
    },
    [currentUser]
  );

  // Listen to global post events
  useRealtimePosts({
    topic: "/topic/posts",
    onPostCreated: handlePostCreated,
    onPostUpdated: handlePostUpdated,
    onPostDeleted: handlePostDeleted,
    onActivityBump: handleActivityBump,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        if (!currentUser?.id) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) setError(null);

        const routeBoostPostId = (
          location.state as { boostPostId?: string } | null
        )?.boostPostId;
        const storedBoostPostId =
          sessionStorage.getItem("homeBoostPostId") || undefined;
        const boostPostId = routeBoostPostId || storedBoostPostId;

        const feedResult = await fetchHomeFeedPosts(200, {
          prioritizePostId: boostPostId,
        });

        if (!isMounted) return;

        if (isMounted) {
          setPostsMap(() => {
            const next = new Map<string, Post>();
            feedResult.posts.forEach((post) => {
              next.set(post.id, post);
            });
            return next;
          });
          // setPostsMap((prev) => {
          //   const next = new Map(prev);
          //   feedResult.posts.forEach((post) => {
          //     if (!next.has(post.id)) {
          //       next.set(post.id, post);
          //     }
          //   });
          //   return next;
          // });
          setError(null);

          if (boostPostId) {
            sessionStorage.removeItem("homeBoostPostId");
            navigate(location.pathname, { replace: true, state: null });
          }
        }
      } catch (err: any) {
        console.error("❌ Error fetching posts:", err);
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load posts");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [currentUser, location.pathname, location.state, navigate]);

  return (
    <div>
      {/* Stories */}
      <StoriesBar />

      {/* Posts Feed */}
      <div>
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Loading posts...
            </p>
          </div>
        )}

        {!loading && !currentUser && (
          <div className="p-8 text-center text-gray-500">
            Please login to view posts
          </div>
        )}

        {error && !loading && (
          <div className="p-4 text-center text-red-500">{error}</div>
        )}

        {!loading && currentUser && !error && postsMap.size === 0 && (
          <div className="p-8 text-center text-gray-500">
            No posts available. Start following friends to see their posts!
          </div>
        )}

        {!loading &&
          !error &&
          sortedPosts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}
