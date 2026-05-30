import { useOutletContext } from "react-router-dom";
import PostGrid from "../components/profile/PostGrid";
import { useProfileMyPosts } from "../hooks/useProfileHooks";
import type { User } from "../types";

interface OutletContext {
  user: User;
  isOwnProfile: boolean;
}

export default function ProfileMyPosts() {
  const { user, isOwnProfile } = useOutletContext<OutletContext>();
  const { posts, loading, error } = useProfileMyPosts(user);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return <PostGrid posts={posts} isOwnProfile={isOwnProfile} />;
}
