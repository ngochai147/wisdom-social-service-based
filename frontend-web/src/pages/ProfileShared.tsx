import { useOutletContext } from "react-router-dom";
import ProfileSharedPosts from "../components/profile/ProfileSharedPosts";
import type { User } from "../types";

interface OutletContext {
  user: User;
  isOwnProfile: boolean;
}

export default function ProfileShared() {
  const { user, isOwnProfile } = useOutletContext<OutletContext>();

  return <ProfileSharedPosts userId={user.id} isOwnProfile={isOwnProfile} user={user} />;
}
