import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import type { User } from "../../types";
import {
  Settings,
  LogOut,
  MessageCircle,
  MapPin,
  Info,
  X,
  AtSign,
  User as UserIcon,
  Calendar,
  Users as UsersIcon,
  MessageSquare,
  Phone,
  Plus,
} from "lucide-react";
import { logout } from "../../utils/auth";
import NoteModal from "./note-modal/NoteModal";
import FriendsModal from "./FriendsModal";
import { buildS3Url } from "../../utils/s3";
import BlockUnblockButton from "../friend/BlockUnblockButton";
import FriendActions from "../friend/FriendActions";
import { NOTE_PLACEHOLDERS } from "./note-modal/NoteContentDefault";
import { getUserPostsWithDetails } from "../../services/postService";
import { useProfileNote } from "../../hooks/useProfileNote";
import { useHasActiveStory } from "../../hooks/useHasActiveStory";
import { fetchUserStories } from "../../services/storyService";
import StoryViewerModal from "../story/StoryViewerModal";
import { usePresenceStatus } from "../../hooks/usePresenceStatus";
import {
  getUserHighlights,
  type StoryHighlight,
} from "../../services/highlightService";


interface ProfileHeaderProps {
  user: User;
  isOwnProfile?: boolean;
  onFriendAccepted?: () => void;
  onFriendRemoved?: () => void;
}

const GENDER_LABELS: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  HIDDEN: "Ẩn",
  OTHER: "Khác",
};

const stripHtml = (text: string | undefined | null): string => {
  if (!text) return "";
  try {
    const doc = new DOMParser().parseFromString(text, "text/html");
    return doc.body.textContent || "";
  } catch (e) {
    return text.replace(/<(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*>/g, "");
  }
};

export default function ProfileHeader({
  user,
  isOwnProfile = false,
  onFriendAccepted,
  onFriendRemoved,
}: ProfileHeaderProps) {
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [notePlaceholder] = useState(
    () =>
      NOTE_PLACEHOLDERS[Math.floor(Math.random() * NOTE_PLACEHOLDERS.length)]
  );
  const { note, showNoteModal, openNoteModal, closeNoteModal, setNote } =
    useProfileNote(user?.id);

  const profileUserId = Number(user?.id);
  const presenceByUserId = usePresenceStatus([profileUserId]);
  const isUserOnline = Boolean(
    Number.isFinite(profileUserId) && presenceByUserId[profileUserId]?.online
  );

  useEffect(() => {
    if (!user?.id) return;
    getUserPostsWithDetails(user.id)
      .then((posts) => setPostsCount(posts.length))
      .catch(() => setPostsCount(0));
  }, [user?.id]);

  // Check if user has an active story
  const {
    hasStory: hasActiveStory,
    hasUnviewed: hasUnviewedStory,
    refresh: refreshActiveStory,
  } = useHasActiveStory(user?.id);

  const [activeStories, setActiveStories] = useState<any[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Highlights state
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [_showCreateHighlight, setShowCreateHighlight] = useState(false);
  const [viewingHighlight, setViewingHighlight] =
    useState<StoryHighlight | null>(null);

  // Fetch highlights
  const fetchHighlights = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getUserHighlights(String(user.id));
      setHighlights(data);
    } catch (err) {
      console.error("Error fetching highlights:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const handleAvatarClick = async () => {
    if (!hasActiveStory || !user?.id) return;
    try {
      const data = (await fetchUserStories(String(user.id))) as any;
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      if (items.length > 0) {
        setActiveStories(items);
        setIsViewerOpen(true);
      }
    } catch (err) {
      console.error("Error fetching user stories for header:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleCloseViewer = useCallback(() => {
    setIsViewerOpen(false);
  }, []);

  const avatarSrc =
    buildS3Url(user.avatarUrl) || user.avatarUrl || "https://i.pravatar.cc/150";
  const displayName = user.fullName || user.name || user.username;
  const genderLabel = user.gender ? GENDER_LABELS[user.gender] : null;

  return (
    <div className="bg-white dark:bg-black">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
        {/* ── Top section: Avatar Column (left) + User Info (right) ────── */}
        <div className="flex gap-8 md:gap-10">
          {/* Avatar Column */}
          <div className="flex flex-col items-center shrink-0">
            {/* Note bubble above avatar */}
            {(isOwnProfile || note) && (
              <button
                onClick={openNoteModal}
                className="mb-3 w-42 max-w-full bg-white dark:bg-gray-800 border border-blue-200/80 dark:border-blue-700/60 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                title={isOwnProfile ? "Tạo / sửa ghi chú" : "Xem ghi chú"}
              >
                <div className="min-w-0">
                  {note ? (
                    <div className="space-y-0.5">
                      {note.content?.trim() && (
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 wrap-break-word">
                          {stripHtml(note.content)}
                        </p>
                      )}
                      {note.music?.title && (
                        <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-1">
                          ♪ {note.music.title}
                        </p>
                      )}
                      {note.music?.artist && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                          {note.music.artist}
                        </p>
                      )}
                      {note.location?.trim() && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="truncate">
                            {note.location.trim()}
                          </span>
                        </p>
                      )}
                      {!note.content?.trim() &&
                        !note.music?.title &&
                        !note.music?.artist &&
                        !note.location?.trim() && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Nhấn để cập nhật ghi chú
                          </p>
                        )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {notePlaceholder}
                    </p>
                  )}
                </div>
              </button>
            )}

            {/* Avatar with story ring + presence dot */}
            <div
              className={`relative mb-2 select-none ${
                hasActiveStory
                  ? "cursor-pointer hover:scale-[1.02] active:scale-98 transition-all duration-200"
                  : ""
              }`}
              onClick={handleAvatarClick}
              title={hasActiveStory ? "Xem tin" : undefined}
            >
              <div
                className={
                  hasActiveStory
                    ? `p-0.75 rounded-full ${
                        hasUnviewedStory
                          ? `bg-linear-to-tr ${
                              isOwnProfile
                                ? "from-green-400 to-emerald-500"
                                : "from-blue-400 to-indigo-500"
                            }`
                          : "bg-gray-300 dark:bg-zinc-700"
                      }`
                    : ""
                }
              >
                <img
                  src={avatarSrc}
                  alt={user.username}
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ${
                    hasActiveStory
                      ? "border-4 border-white dark:border-black"
                      : "border border-gray-200 dark:border-[#363636]"
                  }`}
                />
              </div>
              {isUserOnline && (
                <div
                  className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-black"
                  title="Đang hoạt động"
                />
              )}
            </div>
          </div>

          {/* Right column: username + stats + info + actions */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
            {/* Username row */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[18px] md:text-[20px] font-bold dark:text-white truncate flex-1">
                {user.username}
              </h1>
              {isOwnProfile && (
                <Link
                  to="/settings"
                  className="shrink-0 p-1.5 -m-1.5 text-gray-900 dark:text-gray-100 hover:opacity-60"
                  title="Cài đặt"
                >
                  <Settings size={22} />
                </Link>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 md:gap-10">
              <Stat value={postsCount} label="Bài viết" />
              <Stat
                value={
                  typeof user.friendsCount === "number"
                    ? user.friendsCount
                    : user.friendsCount || 0
                }
                label="Bạn bè"
              />
              {isOwnProfile && (
                <Stat value={user.followingCount ?? 0} label="Theo dõi" />
              )}
            </div>

            {/* Info block */}
            <div className="space-y-0.5">
              <p className="text-[14px] font-semibold dark:text-white leading-snug">
                {displayName}
              </p>
              {genderLabel && (
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  {genderLabel}
                </p>
              )}
              {user.birthday && (
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  {user.birthday}
                </p>
              )}
              {user.bio && (
                <p className="text-[14px] dark:text-gray-200 leading-relaxed">
                  {stripHtml(user.bio)}
                </p>
              )}
              {isOwnProfile && user.phone && (
                <p className="text-[14px] text-blue-500 dark:text-blue-400">
                  {user.phone}
                </p>
              )}
            </div>

            {/* Action buttons row */}
            <div className="flex items-center gap-1.5 mt-1">
              {isOwnProfile ? (
                <>
                  <Link
                    to="/edit-profile"
                    className="flex-1 inline-flex items-center justify-center h-8.5 px-3 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg text-[14px] font-semibold dark:text-white transition-colors"
                  >
                    Chỉnh sửa hồ sơ
                  </Link>
                  <Link
                    to="/friend-requests"
                    className="flex-1 inline-flex items-center justify-center h-8.5 px-3 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg text-[14px] font-semibold dark:text-white transition-colors"
                  >
                    Danh sách bạn bè
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center w-8.5 h-8.5 bg-[#efefef] dark:bg-[#262626] hover:bg-red-50 dark:hover:bg-red-900/30 border border-[#dbdbdb] dark:border-[#363636] text-red-600 dark:text-red-400 rounded-lg transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0 [&>button]:w-full [&>button]:h-8.5 [&>button]:rounded-lg [&>button]:text-[14px] [&>button]:whitespace-nowrap [&>div]:w-full [&>div>button]:flex-1 [&>div>button]:h-8.5 [&>div>button]:rounded-lg [&>div>button]:text-[14px] [&>div>button]:whitespace-nowrap">
                    <FriendActions
                      targetUserId={user.id}
                      targetUsername={user.username}
                      size="md"
                      showText={true}
                      onFriendAccepted={onFriendAccepted}
                      onFriendRemoved={onFriendRemoved}
                    />
                  </div>
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 h-8.5 px-3 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg text-[14px] font-semibold dark:text-white transition-colors">
                    <MessageCircle size={14} /> Nhắn tin
                  </button>
                  <button
                    onClick={() => setShowInfoModal(true)}
                    className="inline-flex items-center justify-center w-8.5 h-8.5 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg dark:text-white transition-colors"
                    title="Thông tin"
                  >
                    <Info size={15} />
                  </button>
                  <div className="[&>button]:w-8.5! [&>button]:h-8.5! [&>button]:p-0! [&>button]:rounded-lg! [&>button>span]:hidden">
                    <BlockUnblockButton
                      userId={user.id}
                      username={user.username}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Story Highlights Section - Full width */}
          {(isOwnProfile || highlights.length > 0) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#262626]">
              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-thin">
                {/* Create New Highlight Button (own profile only) */}
                {isOwnProfile && (
                  <button
                    onClick={() => setShowCreateHighlight(true)}
                    className="flex flex-col items-center gap-2 shrink-0 group"
                  >
                    <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-gray-300 dark:border-[#363636] flex items-center justify-center group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors bg-gray-50 dark:bg-[#1a1a1a] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10">
                      <Plus
                        size={28}
                        strokeWidth={1.5}
                        className="text-gray-400 group-hover:text-blue-500 transition-colors"
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium group-hover:text-blue-500 transition-colors w-[72px] text-center truncate">
                      Mới
                    </span>
                  </button>
                )}

                {/* Existing Highlights */}
                {highlights.map((hl) => {
                  const isTextCover =
                    hl.coverImageUrl?.startsWith("text-story:");
                  const coverUrl = isTextCover
                    ? null
                    : buildS3Url(hl.coverImageUrl) ||
                      (hl.stories?.[0]?.media?.url
                        ? buildS3Url(hl.stories[0].media.url)
                        : null);

                  return (
                    <button
                      key={hl.id}
                      onClick={() => {
                        if (hl.stories && hl.stories.length > 0) {
                          setViewingHighlight(hl);
                          setActiveStories(hl.stories);
                          setIsViewerOpen(true);
                        }
                      }}
                      className="flex flex-col items-center gap-2 shrink-0 group"
                    >
                      <div className="w-[72px] h-[72px] rounded-full p-[2px] bg-gradient-to-tr from-gray-300 to-gray-400 dark:from-[#525252] dark:to-[#404040] group-hover:from-blue-400 group-hover:to-indigo-500 transition-all">
                        <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#1a1a1a] bg-gray-100 dark:bg-[#262626]">
                          {isTextCover ? (
                            (() => {
                              const storyText = hl.coverImageUrl!.substring(
                                "text-story:".length
                              );
                              const bgMatch = storyText.match(/\[bg:(.*?)\]/);
                              let bgClass =
                                "bg-gradient-to-br from-purple-500 to-blue-500";
                              let cleanText = storyText;
                              if (bgMatch) {
                                bgClass = bgMatch[1];
                                cleanText = storyText
                                  .replace(/\[bg:(.*?)\]/, "")
                                  .trim();
                              }
                              return (
                                <div
                                  className={`w-full h-full ${bgClass} flex items-center justify-center p-1 text-center`}
                                >
                                  <span className="text-white text-[8px] line-clamp-2 leading-tight font-bold">
                                    {cleanText}
                                  </span>
                                </div>
                              );
                            })()
                          ) : coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={hl.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                              <span className="text-white text-lg font-bold">
                                {hl.title.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium group-hover:text-blue-500 transition-colors w-[72px] text-center truncate">
                        {hl.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Story Highlights Section ─────────────────────────────────── */}
        {isOwnProfile && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#262626]">
            <div className="flex gap-5 overflow-x-auto pb-2">
              <Link
                to="/create-story"
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className="w-18 h-18 rounded-full border-2 border-dashed border-gray-300 dark:border-[#363636] flex items-center justify-center group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors bg-gray-50 dark:bg-[#1a1a1a] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10">
                  <Plus
                    size={28}
                    strokeWidth={1.5}
                    className="text-gray-400 group-hover:text-blue-500 transition-colors"
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium group-hover:text-blue-500 transition-colors">
                  Mới
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Note modal ──────────────────────────────────────────────── */}
      {showNoteModal && (
        <NoteModal
          userId={String(user.id)}
          isOwnProfile={isOwnProfile}
          onClose={closeNoteModal}
          onNoteChange={(updated) => setNote(updated)}
        />
      )}

      {/* ── Friends modal ───────────────────────────────────────────── */}
      {showFriendsModal && (
        <FriendsModal
          userId={user.id}
          onClose={() => setShowFriendsModal(false)}
        />
      )}

      {isViewerOpen && activeStories.length > 0 && (
        <StoryViewerModal
          isOpen={isViewerOpen}
          onClose={() => {
            handleCloseViewer();
            setViewingHighlight(null);
          }}
          groups={[
            {
              userId: String(user.id),
              username: viewingHighlight
                ? viewingHighlight.title
                : user.username,
              userAvatar: user.avatarUrl,
              stories: activeStories,
            },
          ]}
          initialGroupIdx={0}
          initialStoryIdx={0}
          onStoryViewed={refreshActiveStory}
        />
      )}

      {/* ── Info modal (other user) ─────────────────────────────────── */}
      {showInfoModal && !isOwnProfile && (
        <div
          className="fixed inset-0 z-80 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#262626]">
              <h2 className="text-base font-bold dark:text-white">Thông tin</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex items-center gap-4 px-5 py-5">
              <img
                src={avatarSrc}
                alt={user.username}
                className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-[#363636]"
              />
              <div className="min-w-0">
                <p className="font-bold text-base dark:text-white truncate">
                  {displayName}
                </p>
                {user.username && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-[#262626] mx-5" />

            <div className="px-5 pb-5 pt-2 max-h-[55vh] overflow-y-auto">
              {user.username && (
                <InfoRow
                  icon={<AtSign size={16} />}
                  label="Tên người dùng"
                  value={`@${user.username}`}
                />
              )}
              {displayName && (
                <InfoRow
                  icon={<UserIcon size={16} />}
                  label="Họ và tên"
                  value={displayName}
                />
              )}
              {user.birthday && (
                <InfoRow
                  icon={<Calendar size={16} />}
                  label="Ngày sinh"
                  value={user.birthday}
                />
              )}
              {genderLabel && (
                <InfoRow
                  icon={<UsersIcon size={16} />}
                  label="Giới tính"
                  value={genderLabel}
                />
              )}
              {user.bio && (
                <InfoRow
                  icon={<MessageSquare size={16} />}
                  label="Giới thiệu"
                  value={stripHtml(user.bio)}
                />
              )}
              {user.phone && (
                <InfoRow
                  icon={<Phone size={16} />}
                  label="Số điện thoại"
                  value={user.phone}
                />
              )}
              {typeof user.friendsCount === "number" && (
                <InfoRow
                  icon={<UsersIcon size={16} />}
                  label="Bạn bè"
                  value={`${user.friendsCount} người`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  onClick,
}: {
  value: number | string;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-[17px] font-bold dark:text-white leading-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-[13px] text-gray-700 dark:text-gray-300 leading-tight">
        {label}
      </span>
    </>
  );
  return onClick ? (
    <button
      onClick={onClick}
      className="flex flex-col items-center md:items-start hover:opacity-70 transition-opacity"
    >
      {content}
    </button>
  ) : (
    <div className="flex flex-col items-center md:items-start">{content}</div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-[#262626] last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#262626] flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">
          {label}
        </p>
        <p className="text-sm dark:text-white wrap-break-word">{value}</p>
      </div>
    </div>
  );
}
