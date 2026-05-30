import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Settings,
  Users,
  Loader2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Link as LinkIcon,
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  FileText,
  Trash2,
  Edit,
  Search,
  X,
  MessageCircle,
  Share2,
  ThumbsUp,
  Bell,
  MoreHorizontal,
  Camera,
  Flag,
  ChevronDown,
  UserCheck,
  UserMinus,
  PenSquare,
  ImageIcon,
  Plus,
} from "lucide-react";
import pageService, {
  type Page,
  type PageMember,
} from "../services/pageService";
import userService from "../services/userService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { buildS3Url } from "../utils/s3";
import websocketService from "../services/websocket";
import type { User } from "../types";
import { useRealtimePagePosts } from "../hooks/useRealtimePagePosts";
import { useRealtimePageList } from "../hooks/useRealtimePageList";
import ConfirmModal from "../components/common/ConfirmModal";

type MemberStatus =
  | "loading"
  | "none"
  | "pending"
  | "member"
  | "admin"
  | "owner"
  | "blocked";
type PageRole = "ADMIN" | "EDITOR" | "MODERATOR" | "ANALYST" | "USER";

const PAGE_ROLES: { label: string; value: PageRole }[] = [
  { label: "Admin", value: "ADMIN" },
  { label: "Editor", value: "EDITOR" },
  { label: "Moderator", value: "MODERATOR" },
  { label: "Analyst", value: "ANALYST" },
  { label: "User", value: "USER" },
];

interface Post {
  _id: string;
  content?: string;
  images?: string[];
  authorId?: string;
  createdAt?: string;
  likesCount?: number;
  commentsCount?: number;
}

type PendingMember = PageMember;

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PageDetail() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  // Validate pageId — guard against "undefined", "NaN", or missing route param
  const numericPageId = useMemo(() => {
    if (!pageId || pageId === "undefined") return null;
    const n = Number(pageId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [pageId]);

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberStatus, setMemberStatus] = useState<MemberStatus>("loading");
  const [memberCount, setMemberCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "posts" | "about" | "members" | "pending" | "my-pending"
  >("posts");

  const [posts, setPosts] = useState<Post[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [myPendingPosts, setMyPendingPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMyPending, setLoadingMyPending] = useState(false);
  const [withdrawingPost, setWithdrawingPost] = useState<string | null>(null);

  const [pendingRequests, setPendingRequests] = useState<PendingMember[]>([]);
  const [loadingPendingRequests, setLoadingPendingRequests] = useState(false);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<PageRole>("USER");
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [members, setMembers] = useState<PageMember[]>([]);

  const [postActionLoading, setPostActionLoading] = useState<string | null>(
    null,
  );
  const [requestActionLoading, setRequestActionLoading] = useState<
    number | null
  >(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    variant?: "warning" | "default";
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning" | "default";
    action: () => Promise<void>;
  } | null>(null);

  const showConfirm = (
    title: string,
    message: string,
    confirmText: string,
    variant: "danger" | "warning" | "default",
    action: () => Promise<void>,
  ) => {
    setConfirmModal({ title, message, confirmText, variant, action });
  };

  // Create post state
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [createPostContent, setCreatePostContent] = useState("");
  const [createPostImages, setCreatePostImages] = useState<string[]>([]);
  const [createPostImageInput, setCreatePostImageInput] = useState("");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [createPostSuccess, setCreatePostSuccess] = useState<string | null>(
    null,
  );

  const loadPageData = useCallback(async () => {
    if (!numericPageId) return;
    setLoading(true);
    try {
      const [pageData, count] = await Promise.all([
        pageService.getPageById(numericPageId),
        pageService.getMemberCount(numericPageId),
      ]);
      setPage(pageData);
      setMemberCount(count);

      const currentUserId = currentUser?.id ? Number(currentUser.id) : null;
      const pageOwnerId = pageData.createdBy?.id
        ? Number(pageData.createdBy.id)
        : pageData.userId
          ? Number(pageData.userId)
          : null;

      if (currentUserId && currentUserId === pageOwnerId) {
        setMemberStatus("owner");
      } else if (currentUserId) {
        try {
          const membersList = await pageService.getPageMembers(numericPageId);
          const currentMember = membersList?.find(
            (m) => Number(m.user?.id) === currentUserId,
          );
          if (currentMember) {
            if (
              currentMember.status === "BLOCKED" ||
              currentMember.status === "REMOVED"
            ) {
              setMemberStatus("blocked");
            } else if (currentMember.status === "PENDING") {
              setMemberStatus("pending");
            } else if (
              currentMember.role === "ADMIN" ||
              currentMember.role === "MODERATOR"
            ) {
              setMemberStatus("admin");
            } else if (currentMember.status === "ACTIVE") {
              setMemberStatus("member");
            } else {
              setMemberStatus("none");
            }
          } else {
            try {
              const status = await pageService.getMemberStatus(
                numericPageId,
                currentUserId,
              );
              setMemberStatus(status === "PENDING" ? "pending" : "none");
            } catch {
              setMemberStatus("none");
            }
          }
        } catch {
          setMemberStatus("none");
        }
        try {
          const interactionStatus =
            await pageService.getPageInteractionStatus(numericPageId);
          setIsLiked(interactionStatus.isLiked || false);
          setIsFollowing(interactionStatus.isFollowing || false);
        } catch {}
      } else {
        setMemberStatus("none");
      }
    } catch (error) {
      console.error("Error loading page:", error);
    } finally {
      setLoading(false);
    }
  }, [numericPageId, currentUser?.id]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const handleLike = async () => {
    if (!currentUser?.id || !numericPageId) return;
    setActionLoading(true);
    try {
      if (isLiked) {
        await pageService.cancelLikePage(currentUser.id, numericPageId);
        setIsLiked(false);
      } else {
        await pageService.likePage(currentUser.id, numericPageId);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.id || !numericPageId) return;
    setActionLoading(true);
    try {
      if (isFollowing) {
        await pageService.cancelFollowPage(currentUser.id, numericPageId);
        setIsFollowing(false);
      } else {
        await pageService.followPage(currentUser.id, numericPageId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!currentUser?.id || !numericPageId) return;
    setActionLoading(true);
    try {
      if (memberStatus === "pending") {
        await pageService.cancelJoinRequest(numericPageId, currentUser.id);
        setMemberStatus("none");
      } else {
        await pageService.requestJoinPage(currentUser.id, numericPageId);
        // PUBLIC page → instantly a member; PRIVATE → pending
        const newStatus = page?.status === "PRIVATE" ? "pending" : "member";
        setMemberStatus(newStatus);
        if (newStatus === "member") setMemberCount((c) => c + 1);
      }
    } catch (error) {
      console.error("Error handling join request:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const loadPosts = useCallback(async () => {
    if (!numericPageId) return;
    setLoadingPosts(true);
    try {
      const approvedPosts = await pageService.getAllPostsOfPage(numericPageId);
      setPosts(approvedPosts || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, [numericPageId]);

  const loadPendingPosts = useCallback(async () => {
    if (!numericPageId || !currentUser?.id) return;
    try {
      const pending =
        await pageService.getPostsWaitingForApproval(numericPageId);
      setPendingPosts(pending || []);
    } catch (error) {
      console.error("Error loading pending posts:", error);
    }
  }, [numericPageId, currentUser?.id]);

  const loadMyPendingPosts = useCallback(async () => {
    if (!numericPageId || !currentUser?.id) return;
    setLoadingMyPending(true);
    try {
      const myPending = await pageService.getMyPendingPosts(numericPageId);
      setMyPendingPosts(myPending || []);
    } catch (error) {
      console.error("Error loading my pending posts:", error);
    } finally {
      setLoadingMyPending(false);
    }
  }, [numericPageId, currentUser?.id]);

  const loadPendingRequests = useCallback(async () => {
    if (!numericPageId) return;
    setLoadingPendingRequests(true);
    try {
      const requests = await pageService.getPendingJoinRequests(numericPageId);
      setPendingRequests(requests || []);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    } finally {
      setLoadingPendingRequests(false);
    }
  }, [numericPageId]);

  const loadMembers = useCallback(async () => {
    if (!numericPageId) return;
    try {
      const membersList = await pageService.getPageMembers(numericPageId);
      setMembers(membersList || []);
    } catch (error) {
      console.error("Error loading members:", error);
    }
  }, [numericPageId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);
  useEffect(() => {
    if (memberStatus === "owner" || memberStatus === "admin") {
      loadPendingPosts();
      loadPendingRequests();
      loadMembers();
    }
    if (memberStatus === "member") {
      loadMyPendingPosts();
    }
  }, [
    memberStatus,
    loadPendingPosts,
    loadPendingRequests,
    loadMembers,
    loadMyPendingPosts,
  ]);

  // Real-time page events via WebSocket
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;
  useEffect(() => {
    if (!numericPageId) return;

    const handlePageEvent = (event: Record<string, unknown>) => {
      const type = event.eventType as string | undefined;
      if (!type) return;

      if (type === "PAGE_MEMBER_JOINED" || type === "PAGE_MEMBER_LEFT") {
        void pageService
          .getMemberCount(numericPageId)
          .then((count) => setMemberCount(count));
        void loadMembers();
        if (
          type === "PAGE_MEMBER_LEFT" &&
          event.userId &&
          Number(event.userId) === currentUserId
        ) {
          setMemberStatus("none");
          void loadPageData();
        }
      }
      if (
        type === "PAGE_JOIN_REQUESTED" ||
        type === "PAGE_JOIN_APPROVED" ||
        type === "PAGE_JOIN_REJECTED" ||
        type === "PAGE_JOIN_CANCELLED"
      ) {
        void loadPendingRequests();
      }
      if (
        type === "PAGE_MEMBER_ROLE_CHANGED" ||
        type === "PAGE_MEMBER_BLOCKED" ||
        type === "PAGE_MEMBER_UNBLOCKED"
      ) {
        void loadMembers();
        // If the current user was affected, reload their own status
        if (event.userId && Number(event.userId) === currentUserId) {
          void loadPageData();
        }
      }
      // If current user's request was approved/rejected, only update memberStatus
      if (type === "PAGE_JOIN_APPROVED") {
        if (event.userId && Number(event.userId) === currentUserId) {
          setMemberStatus("member");
          setMemberCount((c) => c + 1);
        }
      }
      if (type === "PAGE_JOIN_REJECTED") {
        if (event.userId && Number(event.userId) === currentUserId) {
          setMemberStatus("none");
        }
      }
    };

    const setup = async () => {
      try {
        await websocketService.connect();
        websocketService.subscribeToPageMembers(numericPageId, handlePageEvent);
        if (currentUserId) {
          websocketService.subscribeToUserPageEvents(
            currentUserId,
            handlePageEvent,
          );
        }
      } catch {
        // Connection failed — polling already works as fallback
      }
    };

    void setup();

    return () => {
      websocketService.unsubscribeFromPageMembers(numericPageId);
      if (currentUserId) {
        websocketService.unsubscribeFromUserPageEvents(currentUserId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericPageId, currentUserId]);

  // Real-time: lắng nghe page updates (avatar/cover changes từ mobile)
  useRealtimePageList({
    onPageUpdated: (pageId, _page) => {
      console.log(
        "🔄 [Web PageDetail] Page updated event received for pageId:",
        pageId,
        "Current numericPageId:",
        numericPageId,
      );
      if (numericPageId && pageId === numericPageId) {
        console.log("✅ [Web PageDetail] Reloading page data due to update");
        void loadPageData();
      }
    },
    onPageDeleted: (pageId) => {
      console.log(
        "🗑️ [Web PageDetail] Page deleted event received for pageId:",
        pageId,
        "Current numericPageId:",
        numericPageId,
      );
      if (numericPageId && pageId === numericPageId) {
        navigate("/pages");
      }
    },
  });

  // Real-time: lắng nghe posts của page
  useRealtimePagePosts({
    pageId: numericPageId,
    onPostSubmitted: (_postId, post) => {
      // Bài viết mới được gửi → thêm vào pending list (chỉ admin/owner thấy)
      if (post && (memberStatus === "owner" || memberStatus === "admin")) {
        setPendingPosts((prev) => {
          const newPost = {
            ...post,
            _id: (post as any)._id || (post as any).id || _postId,
          } as unknown as Post;
          if (prev.some((p) => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
      }
      // Nếu chính mình vừa post → thêm vào myPendingPosts
      if (post && memberStatus === "member") {
        const postAuthorId = (post as any).authorId;
        const myId = currentUser?.id ? String(currentUser.id) : null;
        if (myId && postAuthorId === myId) {
          setMyPendingPosts((prev) => {
            const newPost = {
              ...post,
              _id: (post as any)._id || (post as any).id || _postId,
            } as unknown as Post;
            if (prev.some((p) => p._id === newPost._id)) return prev;
            return [newPost, ...prev];
          });
        }
      }
    },
    onPostApproved: (postId, post) => {
      // Bài viết được duyệt → chuyển từ pending → approved
      setPendingPosts((prev) => {
        const found = prev.find((p) => p._id === postId);
        if (found || post) {
          const rawPost = post
            ? { ...post, _id: (post as any)._id || (post as any).id || postId }
            : null;
          const approvedPost = (rawPost as unknown as Post) ?? found;
          if (approvedPost) {
            setPosts((ap) => {
              if (ap.some((p) => p._id === postId)) return ap;
              return [approvedPost, ...ap];
            });
          }
        }
        return prev.filter((p) => p._id !== postId);
      });
      // Xóa khỏi my-pending nếu bài được duyệt
      setMyPendingPosts((prev) => prev.filter((p) => p._id !== postId));
    },
    onPostRejected: (postId) => {
      // Bài viết bị từ chối → xóa khỏi pending
      setPendingPosts((prev) => prev.filter((p) => p._id !== postId));
      // Xóa khỏi my-pending nếu bài bị từ chối
      setMyPendingPosts((prev) => prev.filter((p) => p._id !== postId));
    },
    onPostRemoved: (postId) => {
      // Bài viết bị xóa → xóa khỏi approved
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setMyPendingPosts((prev) => prev.filter((p) => p._id !== postId));
      setPendingPosts((prev) => prev.filter((p) => p._id !== postId));
    },
  });

  useEffect(() => {
    if (!memberSearchQuery || memberSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results =
          await userService.searchUserByUsername(memberSearchQuery);
        if (results && Array.isArray(results)) {
          const memberIds = members.map((m) => m.user?.id);
          setSearchResults(
            results.filter((u) => !memberIds.includes(Number(u.id))),
          );
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [memberSearchQuery, members]);

  const handleApprovePost = async (postId: string) => {
    if (!currentUser?.id || !numericPageId) return;
    setPostActionLoading(postId);
    try {
      await pageService.approvePost(currentUser.id, numericPageId, postId);
      const post = pendingPosts.find((p) => p._id === postId);
      if (post) {
        setPendingPosts((prev) => prev.filter((p) => p._id !== postId));
        setPosts((prev) => [post, ...prev]);
      }
    } catch {
      setNotification({
        title: "Lỗi",
        message: "Không thể duyệt bài viết",
        variant: "warning",
      });
    } finally {
      setPostActionLoading(null);
    }
  };

  const handleRejectPost = (postId: string) => {
    if (!currentUser?.id || !numericPageId) return;
    showConfirm(
      "Từ chối bài viết",
      "Bạn có chắc muốn từ chối bài viết này?",
      "Từ chối",
      "warning",
      async () => {
        setPostActionLoading(postId);
        try {
          await pageService.cancelApprovePost(
            currentUser.id,
            numericPageId,
            postId,
          );
          setPendingPosts((prev) => prev.filter((p) => p._id !== postId));
        } catch {
          setNotification({
            title: "Lỗi",
            message: "Không thể từ chối bài viết",
            variant: "warning",
          });
        } finally {
          setPostActionLoading(null);
        }
      },
    );
  };

  const handleRemovePost = (postId: string) => {
    if (!currentUser?.id || !numericPageId) return;
    showConfirm(
      "Xóa bài viết",
      "Bạn có chắc muốn xóa bài viết này?",
      "Xóa",
      "danger",
      async () => {
        setPostActionLoading(postId);
        try {
          await pageService.removePostFromPage(
            currentUser.id,
            numericPageId,
            postId,
          );
          setPosts((prev) => prev.filter((p) => p._id !== postId));
        } catch {
          setNotification({
            title: "Lỗi",
            message: "Không thể xóa bài viết",
            variant: "warning",
          });
        } finally {
          setPostActionLoading(null);
        }
      },
    );
  };

  const handleApproveRequest = async (userId: number) => {
    if (!numericPageId) return;
    setRequestActionLoading(userId);
    try {
      await pageService.approveJoinRequest(numericPageId, userId);
      const approved = pendingRequests.find(
        (r) => Number(r.user?.id) === userId,
      );
      setPendingRequests((prev) =>
        prev.filter((r) => Number(r.user?.id) !== userId),
      );
      if (approved) {
        setMembers((prev) => [
          ...prev,
          { ...approved, status: "ACTIVE" as any, role: "USER" as any },
        ]);
      }
      setMemberCount((prev) => prev + 1);
    } catch {
      setNotification({
        title: "Lỗi",
        message: "Không thể duyệt yêu cầu",
        variant: "warning",
      });
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleRejectRequest = async (userId: number) => {
    if (!numericPageId) return;
    setRequestActionLoading(userId);
    try {
      await pageService.rejectJoinRequest(numericPageId, userId);
      setPendingRequests((prev) =>
        prev.filter((r) => Number(r.user?.id) !== userId),
      );
    } catch {
      setNotification({
        title: "Lỗi",
        message: "Không thể từ chối yêu cầu",
        variant: "warning",
      });
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleLeavePage = () => {
    if (!numericPageId || !currentUser?.id) return;
    showConfirm(
      "Rời page",
      "Bạn có chắc muốn rời page này?",
      "Rời page",
      "warning",
      async () => {
        try {
          await pageService.deleteMember(numericPageId, currentUser.id);
          setMemberStatus("none");
          setMemberCount((c) => Math.max(0, c - 1));
        } catch {
          setNotification({
            title: "Lỗi",
            message: "Không thể rời page",
            variant: "warning",
          });
        }
      },
    );
  };

  const handleDeletePage = () => {
    if (!numericPageId || memberStatus !== "owner") return;
    showConfirm(
      "Xóa Page",
      "Bạn có chắc muốn XÓA VĨNH VIỄN page này? Hành động này KHÔNG THỂ hoàn tác!",
      "Xóa vĩnh viễn",
      "danger",
      async () => {
        try {
          await pageService.deletePage(numericPageId);
          navigate("/pages");
        } catch {
          setNotification({
            title: "Lỗi",
            message: "Không thể xóa page",
            variant: "warning",
          });
        }
      },
    );
  };

  const handleAddMembers = async () => {
    if (!numericPageId || selectedUsers.length === 0) return;
    setIsAddingMembers(true);
    try {
      await Promise.all(
        selectedUsers.map((user) =>
          pageService.addMember(Number(user.id), numericPageId, selectedRole),
        ),
      );
      setNotification({
        title: "Thành công",
        message: `Đã thêm ${selectedUsers.length} thành viên thành công!`,
        variant: "default",
      });
      setShowAddMemberModal(false);
      setMemberSearchQuery("");
      setSearchResults([]);
      setSelectedUsers([]);
      setSelectedRole("USER");
      setMemberCount((prev) => prev + selectedUsers.length);
      loadMembers();
    } catch {
      setNotification({
        title: "Lỗi",
        message: "Không thể thêm thành viên",
        variant: "warning",
      });
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveMember = (userId: number, name: string) => {
    if (!numericPageId) return;
    showConfirm(
      "Xóa thành viên",
      `Bạn có chắc muốn xóa ${name} khỏi page này?`,
      "Xóa",
      "danger",
      async () => {
        try {
          await pageService.deleteMember(numericPageId, userId);
          setMembers((prev) =>
            prev.filter((m) => Number(m.user?.id) !== userId),
          );
          setMemberCount((prev) => Math.max(0, prev - 1));
        } catch {
          setNotification({
            title: "Lỗi",
            message: "Không thể xóa thành viên",
            variant: "warning",
          });
        }
      },
    );
  };

  const toggleUserSelection = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    setSelectedUsers((prev) =>
      isSelected ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );
  };

  const handleCreatePost = async () => {
    if (!numericPageId || !currentUser?.id) return;
    if (!createPostContent.trim() && createPostImages.length === 0) return;
    setIsCreatingPost(true);
    try {
      const postData = { content: createPostContent.trim() };
      await pageService.addPostToPage(
        numericPageId,
        postData,
        createPostImages.length > 0 ? createPostImages : undefined,
      );
      setCreatePostContent("");
      setCreatePostImages([]);
      setCreatePostImageInput("");
      setShowCreatePostModal(false);
      if (isOwnerOrAdmin) {
        // owner/admin posts are auto-approved → reload posts
        void loadPosts();
        setCreatePostSuccess("Bài viết đã được đăng thành công!");
      } else {
        setCreatePostSuccess("Bài viết đã được gửi và đang chờ duyệt!");
      }
      setTimeout(() => setCreatePostSuccess(null), 4000);
    } catch (error) {
      console.error("Error creating post:", error);
      setNotification({
        title: "Lỗi",
        message: "Không thể tạo bài viết. Vui lòng thử lại.",
        variant: "warning",
      });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = createPostImageInput.trim();
    if (url && !createPostImages.includes(url)) {
      setCreatePostImages((prev) => [...prev, url]);
    }
    setCreatePostImageInput("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-[#18191a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
            <Users size={24} className="text-white" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Đang tải trang...
          </p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-[#18191a]">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Page không tồn tại
        </p>
        <button
          onClick={() => navigate("/pages")}
          className="text-blue-500 hover:underline font-medium"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const isOwnerOrAdmin = memberStatus === "owner" || memberStatus === "admin";
  const canPost =
    memberStatus === "owner" ||
    memberStatus === "admin" ||
    memberStatus === "member";
  const pendingCount = pendingRequests.length + pendingPosts.length;
  const tabs = [
    { id: "posts", label: "Bài viết" },
    { id: "about", label: "Giới thiệu" },
    ...(isOwnerOrAdmin
      ? [
          { id: "members", label: "Thành viên" },
          { id: "pending", label: "Chờ duyệt", badge: pendingCount },
        ]
      : []),
    ...(memberStatus === "member"
      ? [
          {
            id: "my-pending",
            label: "Bài của tôi",
            badge:
              myPendingPosts.length > 0 ? myPendingPosts.length : undefined,
          },
        ]
      : []),
  ] as { id: string; label: string; badge?: number }[];

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#18191a]">
      {notification && (
        <ConfirmModal
          open
          title={notification.title}
          message={notification.message}
          variant={notification.variant ?? "warning"}
          onConfirm={() => setNotification(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          open
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText="Hủy"
          variant={confirmModal.variant}
          onConfirm={async () => {
            const act = confirmModal.action;
            setConfirmModal(null);
            await act();
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {/* Cover + Header */}
      <div className="bg-white dark:bg-[#242526] shadow-sm">
        <div className="max-w-[1300px] mx-auto">
          {/* Cover Image */}
          <div className="relative h-[300px] md:h-[400px] rounded-b-lg overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700">
            {page.coverUrl && (
              <img
                key={`cover-${page.id}-${page.updatedAt}`}
                src={
                  buildS3Url(page.coverUrl)
                    ? `${buildS3Url(page.coverUrl)}?t=${page.updatedAt}`
                    : "https://via.placeholder.com/1200x400"
                }
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
            {/* Overlay gradient bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          {/* Page identity */}
          <div className="px-4 md:px-6 pb-0">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3 -mt-6 md:-mt-4 mb-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  key={`avatar-${page.id}-${page.updatedAt}`}
                  src={
                    buildS3Url(page.avatarUrl)
                      ? `${buildS3Url(page.avatarUrl)}?t=${page.updatedAt}`
                      : "https://via.placeholder.com/168"
                  }
                  alt={page.name}
                  className="w-40 h-40 md:w-44 md:h-44 rounded-full object-cover border-4 border-white dark:border-[#242526] shadow-md bg-white dark:bg-[#3a3b3c]"
                />
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => navigate(`/pages/${pageId}/edit`)}
                    className="absolute bottom-2 right-2 w-9 h-9 bg-gray-200 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-[#4e4f50] transition-colors shadow-sm"
                  >
                    <Camera
                      size={16}
                      className="text-gray-700 dark:text-gray-300"
                    />
                  </button>
                )}
              </div>

              {/* Name & meta */}
              <div className="flex-1 min-w-0 lg:pb-4">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight break-words min-w-0">
                    {page.name}
                  </h1>
                  {page.isVerified && (
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={14} className="text-white" />
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-0 text-gray-500 dark:text-gray-400 text-[15px] mt-0.5">
                  {page.category && (
                    <span className="whitespace-nowrap">{page.category}</span>
                  )}
                  {page.username && <span className="mx-0.5">·</span>}
                  {page.username && (
                    <span className="whitespace-nowrap">@{page.username}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-0 mt-1 text-gray-500 dark:text-gray-400 text-[15px]">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Users size={16} className="flex-shrink-0" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {memberCount.toLocaleString()}
                    </span>
                    <span>thành viên</span>
                  </span>
                  {page.status === "PRIVATE" ? (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Lock size={14} className="flex-shrink-0" /> Riêng tư
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Globe size={14} className="flex-shrink-0" /> Công khai
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 lg:pb-4 lg:ml-auto flex-shrink-0">
                {/* Liked badge */}
                {isLiked && (
                  <span className="flex items-center gap-1 text-blue-500 text-sm font-medium">
                    <ThumbsUp size={16} fill="currentColor" />
                    Đã thích
                  </span>
                )}

                {/* Like button */}
                <button
                  onClick={handleLike}
                  disabled={actionLoading || !currentUser}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] font-semibold transition-all ${
                    isLiked
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  <ThumbsUp
                    size={18}
                    fill={isLiked ? "currentColor" : "none"}
                  />
                  {isLiked ? "Bỏ thích" : "Thích"}
                </button>

                {/* Follow button */}
                <button
                  onClick={handleFollow}
                  disabled={actionLoading || !currentUser}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] font-semibold transition-all ${
                    isFollowing
                      ? "bg-gray-200 text-gray-800 dark:bg-[#3a3b3c] dark:text-gray-200 hover:bg-gray-300"
                      : "bg-gray-200 text-gray-800 dark:bg-[#3a3b3c] dark:text-gray-200 hover:bg-gray-300"
                  }`}
                >
                  <Bell size={18} />
                  {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                  <ChevronDown size={14} />
                </button>

                {/* Join button */}
                {memberStatus === "none" && (
                  <button
                    onClick={handleJoinRequest}
                    disabled={actionLoading || !currentUser}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-[#3a3b3c] text-gray-800 dark:text-gray-200 rounded-lg text-[15px] font-semibold hover:bg-gray-300 dark:hover:bg-[#4e4f50] transition-all"
                  >
                    <UserPlus size={18} />
                    {page.status === "PRIVATE" ? "Xin tham gia" : "Tham gia"}
                  </button>
                )}

                {memberStatus === "pending" && (
                  <button
                    onClick={handleJoinRequest}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-[#3a3b3c] text-gray-800 dark:text-gray-200 rounded-lg text-[15px] font-semibold hover:bg-gray-300 transition-all"
                  >
                    <Clock size={18} />
                    Đang chờ duyệt
                  </button>
                )}

                {/* More options */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-[#3a3b3c] text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-[#4e4f50] transition-all"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#3a3b3c] rounded-xl shadow-xl border border-gray-200 dark:border-[#4e4f50] z-50 py-1 overflow-hidden">
                      {isOwnerOrAdmin && (
                        <>
                          <Link
                            to={`/pages/${pageId}/edit`}
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#4e4f50] text-[15px]"
                          >
                            <Edit size={18} />
                            Chỉnh sửa thông tin page
                          </Link>
                          <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#4e4f50] text-[15px]"
                          >
                            <UserPlus size={18} />
                            Thêm thành viên
                          </button>
                        </>
                      )}
                      {memberStatus === "owner" && (
                        <>
                          <div className="border-t border-gray-200 dark:border-[#4e4f50] my-1" />
                          <button
                            onClick={handleDeletePage}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-[15px]"
                          >
                            <Trash2 size={18} />
                            Xóa page
                          </button>
                        </>
                      )}
                      {memberStatus === "member" && (
                        <>
                          <div className="border-t border-gray-200 dark:border-[#4e4f50] my-1" />
                          <button
                            onClick={handleLeavePage}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-[15px]"
                          >
                            <UserMinus size={18} />
                            Rời page
                          </button>
                        </>
                      )}
                      {!isOwnerOrAdmin && (
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#4e4f50] text-[15px]">
                          <Flag size={18} />
                          Báo cáo page
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-t border-gray-200 dark:border-[#3a3b3c] mt-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-[15px] font-semibold transition-colors border-b-[3px] -mb-px ${
                    activeTab === tab.id
                      ? "text-blue-500 border-blue-500"
                      : "text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-t-lg"
                  }`}
                >
                  {tab.label}
                  {tab.badge ? (
                    <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full font-bold">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-[1300px] mx-auto px-4 md:px-6 py-4">
        {/* POSTS TAB */}
        {activeTab === "posts" && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left sidebar */}
            <div className="lg:w-[360px] flex-shrink-0 space-y-3">
              {/* About card */}
              <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-4">
                <h3 className="text-xl font-bold dark:text-white mb-3">
                  Giới thiệu
                </h3>
                {page.description ? (
                  <p className="text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed line-clamp-4">
                    {page.description}
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-[15px] italic">
                    Chưa có mô tả
                  </p>
                )}
                <div className="mt-4 space-y-2.5">
                  {page.category && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-[15px]">
                      <Flag size={18} className="text-gray-400 flex-shrink-0" />
                      <span>{page.category}</span>
                    </div>
                  )}
                  {page.phone && (
                    <a
                      href={`tel:${page.phone}`}
                      className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-500 text-[15px]"
                    >
                      <Phone
                        size={18}
                        className="text-gray-400 flex-shrink-0"
                      />
                      <span>{page.phone}</span>
                    </a>
                  )}
                  {page.email && (
                    <a
                      href={`mailto:${page.email}`}
                      className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-500 text-[15px]"
                    >
                      <Mail size={18} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{page.email}</span>
                    </a>
                  )}
                  {page.website && (
                    <a
                      href={page.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-blue-500 hover:underline text-[15px]"
                    >
                      <LinkIcon size={18} className="flex-shrink-0" />
                      <span className="truncate">{page.website}</span>
                    </a>
                  )}
                  {page.address && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-[15px]">
                      <MapPin
                        size={18}
                        className="text-gray-400 flex-shrink-0"
                      />
                      <span>{page.address}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab("about")}
                  className="w-full mt-4 py-2 bg-gray-100 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-200 rounded-lg text-[15px] font-semibold hover:bg-gray-200 dark:hover:bg-[#4e4f50] transition-colors"
                >
                  Xem thêm
                </button>
              </div>

              {/* Member Status badge */}
              {memberStatus !== "none" && memberStatus !== "loading" && (
                <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-4">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      memberStatus === "owner"
                        ? "bg-purple-50 dark:bg-purple-900/20"
                        : memberStatus === "admin"
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : memberStatus === "blocked"
                            ? "bg-red-50 dark:bg-red-900/20"
                            : memberStatus === "pending"
                              ? "bg-yellow-50 dark:bg-yellow-900/20"
                              : "bg-green-50 dark:bg-green-900/20"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        memberStatus === "owner"
                          ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600"
                          : memberStatus === "admin"
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600"
                            : memberStatus === "blocked"
                              ? "bg-red-100 dark:bg-red-900/40 text-red-600"
                              : memberStatus === "pending"
                                ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600"
                                : "bg-green-100 dark:bg-green-900/40 text-green-600"
                      }`}
                    >
                      {memberStatus === "owner" ? (
                        <Settings size={20} />
                      ) : memberStatus === "admin" ? (
                        <Settings size={20} />
                      ) : memberStatus === "blocked" ? (
                        <XCircle size={20} />
                      ) : memberStatus === "pending" ? (
                        <Clock size={20} />
                      ) : (
                        <UserCheck size={20} />
                      )}
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-[15px] ${
                          memberStatus === "owner"
                            ? "text-purple-700 dark:text-purple-400"
                            : memberStatus === "admin"
                              ? "text-blue-700 dark:text-blue-400"
                              : memberStatus === "blocked"
                                ? "text-red-700 dark:text-red-400"
                                : memberStatus === "pending"
                                  ? "text-yellow-700 dark:text-yellow-400"
                                  : "text-green-700 dark:text-green-400"
                        }`}
                      >
                        {memberStatus === "owner"
                          ? "Chủ sở hữu"
                          : memberStatus === "admin"
                            ? "Quản trị viên"
                            : memberStatus === "blocked"
                              ? "Đã bị chặn"
                              : memberStatus === "pending"
                                ? "Đang chờ duyệt"
                                : "Thành viên"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {memberStatus === "owner"
                          ? "Bạn quản lý page này"
                          : memberStatus === "admin"
                            ? "Bạn có quyền quản trị"
                            : memberStatus === "blocked"
                              ? "Bạn không thể tham gia"
                              : memberStatus === "pending"
                                ? "Chờ admin duyệt"
                                : "Bạn là thành viên"}
                      </p>
                    </div>
                  </div>
                  {isOwnerOrAdmin && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                      >
                        <UserPlus size={16} />
                        Thêm thành viên
                      </button>
                      <Link
                        to={`/pages/${pageId}/posts`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                      >
                        <FileText size={16} />
                        Quản lý bài
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main feed */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Success toast */}
              {createPostSuccess && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-[15px] font-medium animate-pulse">
                  <CheckCircle size={20} />
                  {createPostSuccess}
                </div>
              )}

              {/* Create Post Box — only visible to members/admin/owner */}
              {canPost && (
                <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        buildS3Url(currentUser?.avatarUrl) ||
                        "https://via.placeholder.com/40"
                      }
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <button
                      onClick={() => setShowCreatePostModal(true)}
                      className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-[#3a3b3c] hover:bg-gray-200 dark:hover:bg-[#4e4f50] rounded-full text-gray-500 dark:text-gray-400 text-[15px] transition-colors cursor-pointer"
                    >
                      Bạn đang nghĩ gì?
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-[#3a3b3c]">
                    <button
                      onClick={() => setShowCreatePostModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-lg text-[15px] font-semibold transition-colors"
                    >
                      <ImageIcon size={20} className="text-green-500" />
                      Ảnh/Video
                    </button>
                    <button
                      onClick={() => setShowCreatePostModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-lg text-[15px] font-semibold transition-colors"
                    >
                      <PenSquare size={20} className="text-yellow-500" />
                      Cảm xúc
                    </button>
                  </div>
                </div>
              )}

              {loadingPosts ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText size={36} className="text-gray-400" />
                  </div>
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Chưa có bài viết nào
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-[15px]">
                    {canPost
                      ? "Hãy là người đầu tiên đăng bài!"
                      : "Các bài viết của page sẽ xuất hiện ở đây"}
                  </p>
                  {canPost && (
                    <button
                      onClick={() => setShowCreatePostModal(true)}
                      className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-xl text-[15px] font-semibold hover:bg-blue-600 transition-colors mx-auto"
                    >
                      <PenSquare size={18} />
                      Tạo bài viết
                    </button>
                  )}
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    page={page}
                    isOwnerOrAdmin={isOwnerOrAdmin}
                    postActionLoading={postActionLoading}
                    onRemove={handleRemovePost}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === "about" && (
          <div className="max-w-2xl">
            <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="text-xl font-bold dark:text-white">
                Giới thiệu về page
              </h2>
              {page.description && (
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed whitespace-pre-line">
                    {page.description}
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-[15px] text-gray-600 dark:text-gray-300">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center flex-shrink-0">
                    {page.status === "PRIVATE" ? (
                      <Lock size={18} className="text-gray-500" />
                    ) : (
                      <Globe size={18} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {page.status === "PRIVATE"
                        ? "Nhóm riêng tư"
                        : "Nhóm công khai"}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {page.status === "PRIVATE"
                        ? "Chỉ thành viên mới thấy được bài viết và thành viên"
                        : "Mọi người đều có thể thấy bài viết và thành viên"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[15px] text-gray-600 dark:text-gray-300">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {memberCount.toLocaleString()} thành viên
                    </p>
                  </div>
                </div>
                {page.phone && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={18} className="text-gray-500" />
                    </div>
                    <a
                      href={`tel:${page.phone}`}
                      className="text-blue-500 hover:underline text-[15px]"
                    >
                      {page.phone}
                    </a>
                  </div>
                )}
                {page.email && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail size={18} className="text-gray-500" />
                    </div>
                    <a
                      href={`mailto:${page.email}`}
                      className="text-blue-500 hover:underline text-[15px]"
                    >
                      {page.email}
                    </a>
                  </div>
                )}
                {page.website && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center flex-shrink-0">
                      <LinkIcon size={18} className="text-gray-500" />
                    </div>
                    <a
                      href={page.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-[15px]"
                    >
                      {page.website}
                    </a>
                  </div>
                )}
                {page.address && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-gray-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-[15px]">
                      {page.address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "members" && isOwnerOrAdmin && (
          <div className="max-w-2xl">
            <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold dark:text-white">
                  Thành viên · {members.length}
                </h2>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  <UserPlus size={16} />
                  Thêm
                </button>
              </div>
              <div className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Chưa có thành viên
                  </p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.user?.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#3a3b3c] transition-colors"
                    >
                      <img
                        src={
                          buildS3Url(member.user?.avatarUrl) ||
                          "https://via.placeholder.com/40"
                        }
                        alt={member.user?.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold dark:text-white text-[15px]">
                          {member.user?.name ||
                            member.user?.username ||
                            `User #${member.user?.id}`}
                        </p>
                        <p className="text-gray-500 text-sm">{member.role}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          member.role === "ADMIN"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 dark:bg-[#3a3b3c] dark:text-gray-400"
                        }`}
                      >
                        {member.role}
                      </span>
                      {isOwnerOrAdmin &&
                        Number(member.user?.id) !== currentUserId &&
                        (memberStatus === "owner" ||
                          member.role !== "ADMIN") && (
                          <button
                            onClick={() =>
                              handleRemoveMember(
                                Number(member.user?.id),
                                member.user?.name ||
                                  member.user?.username ||
                                  "Thành viên",
                              )
                            }
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2"
                            title="Xóa thành viên"
                          >
                            <X size={18} />
                          </button>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PENDING TAB */}
        {activeTab === "pending" && isOwnerOrAdmin && (
          <div className="max-w-2xl space-y-4">
            {/* Join Requests */}
            <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold dark:text-white mb-1">
                Yêu cầu tham gia
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                {pendingRequests.length} yêu cầu đang chờ
              </p>
              {loadingPendingRequests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500" size={28} />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck
                    size={40}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
                  />
                  <p className="text-gray-400 dark:text-gray-500">
                    Không có yêu cầu nào
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.user?.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#3a3b3c]"
                    >
                      <img
                        src={
                          buildS3Url(request.user?.avatarUrl) ||
                          "https://via.placeholder.com/48"
                        }
                        alt={request.user?.username}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold dark:text-white text-[15px]">
                          {request.user?.name ||
                            request.user?.username ||
                            `User #${request.user?.id}`}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          @{request.user?.username}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {requestActionLoading === Number(request.user?.id) ? (
                          <Loader2
                            className="animate-spin text-gray-400"
                            size={20}
                          />
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleApproveRequest(Number(request.user?.id))
                              }
                              className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                            >
                              Chấp nhận
                            </button>
                            <button
                              onClick={() =>
                                handleRejectRequest(Number(request.user?.id))
                              }
                              className="px-4 py-1.5 bg-gray-200 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Posts */}
            {pendingPosts.length > 0 && (
              <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold dark:text-white mb-1">
                  Bài viết chờ duyệt
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  {pendingPosts.length} bài đang chờ
                </p>
                <div className="space-y-3">
                  {pendingPosts.map((post) => (
                    <div
                      key={post._id}
                      className="p-4 border border-gray-200 dark:border-[#3a3b3c] rounded-xl"
                    >
                      {post.content && (
                        <p className="text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed mb-3 line-clamp-3">
                          {post.content}
                        </p>
                      )}
                      {post.images && post.images.length > 0 && (
                        <div
                          className={`grid gap-1.5 mb-3 ${
                            post.images.length === 1
                              ? "grid-cols-1"
                              : post.images.length === 2
                                ? "grid-cols-2"
                                : "grid-cols-3"
                          }`}
                        >
                          {post.images.slice(0, 4).map((img, idx) => (
                            <img
                              key={idx}
                              src={buildS3Url(img) || img}
                              alt=""
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {postActionLoading === post._id ? (
                          <Loader2
                            className="animate-spin text-gray-400"
                            size={18}
                          />
                        ) : (
                          <>
                            <button
                              onClick={() => handleApprovePost(post._id)}
                              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                            >
                              Duyệt bài
                            </button>
                            <button
                              onClick={() => handleRejectPost(post._id)}
                              className="flex-1 py-2 bg-gray-200 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MY PENDING TAB — chỉ member thường thấy */}
      {activeTab === "my-pending" && memberStatus === "member" && (
        <div className="max-w-[1300px] mx-auto px-4 md:px-6 py-4">
          <div className="max-w-2xl space-y-4">
            {/* Header card */}
            <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <Clock
                    size={20}
                    className="text-yellow-600 dark:text-yellow-400"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold dark:text-white">
                    Bài viết của tôi đang chờ duyệt
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Các bài bạn đã đăng đang chờ admin xem xét
                  </p>
                </div>
              </div>
            </div>

            {loadingMyPending ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-yellow-500" size={32} />
              </div>
            ) : myPendingPosts.length === 0 ? (
              <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-[#3a3b3c] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={36} className="text-gray-400" />
                </div>
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Không có bài nào chờ duyệt
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-[15px]">
                  Tất cả bài viết của bạn đã được duyệt hoặc bạn chưa đăng bài
                  nào
                </p>
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-xl text-[15px] font-semibold hover:bg-blue-600 transition-colors mx-auto"
                >
                  <PenSquare size={18} />
                  Đăng bài mới
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myPendingPosts.map((post) => (
                  <div
                    key={post._id}
                    className="bg-white dark:bg-[#242526] rounded-xl shadow-sm overflow-hidden"
                  >
                    {/* Status banner */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-900/30">
                      <Clock
                        size={15}
                        className="text-yellow-600 dark:text-yellow-400 flex-shrink-0"
                      />
                      <span className="text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                        Đang chờ admin duyệt
                      </span>
                      <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>

                    <div className="p-4">
                      {/* Post content */}
                      {post.content && (
                        <p className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed mb-3">
                          {post.content}
                        </p>
                      )}

                      {/* Images */}
                      {post.images && post.images.length > 0 && (
                        <div
                          className={`grid gap-1.5 mb-4 rounded-xl overflow-hidden ${
                            post.images.length === 1
                              ? "grid-cols-1"
                              : post.images.length === 2
                                ? "grid-cols-2"
                                : "grid-cols-3"
                          }`}
                        >
                          {post.images.slice(0, 4).map((img, idx) => (
                            <img
                              key={idx}
                              src={buildS3Url(img) || img}
                              alt=""
                              className="w-full h-40 object-cover"
                            />
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-[#3a3b3c]">
                        <div className="flex-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <FileText size={15} />
                          <span>Bài viết chưa được hiển thị công khai</span>
                        </div>
                        {withdrawingPost === post._id ? (
                          <div className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-400">
                            <Loader2 size={15} className="animate-spin" />
                            Đang rút...
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (!currentUser?.id || !numericPageId) return;
                              showConfirm(
                                "Rút bài viết",
                                "Bạn có chắc muốn rút bài viết này? Bài sẽ bị xóa hoàn toàn.",
                                "Rút bài",
                                "danger",
                                async () => {
                                  setWithdrawingPost(post._id);
                                  try {
                                    await pageService.removePostFromPage(
                                      currentUser.id,
                                      numericPageId,
                                      post._id,
                                    );
                                    setMyPendingPosts((prev) =>
                                      prev.filter((p) => p._id !== post._id),
                                    );
                                  } catch {
                                    setNotification({
                                      title: "Lỗi",
                                      message:
                                        "Không thể rút bài viết. Vui lòng thử lại.",
                                      variant: "warning",
                                    });
                                  } finally {
                                    setWithdrawingPost(null);
                                  }
                                },
                              );
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <X size={15} />
                            Rút bài
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowAddMemberModal(false);
              setMemberSearchQuery("");
              setSearchResults([]);
              setSelectedUsers([]);
            }}
          />
          <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#242526] rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3a3b3c]">
              <div>
                <h2 className="text-xl font-bold dark:text-white">
                  Thêm thành viên
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                  Tìm và thêm người vào page
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberSearchQuery("");
                  setSearchResults([]);
                  setSelectedUsers([]);
                }}
                className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-[#3a3b3c] rounded-full hover:bg-gray-200 dark:hover:bg-[#4e4f50] transition-colors"
              >
                <X size={18} className="dark:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo username..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-[#3a3b3c] border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[15px]"
                />
              </div>

              {isSearching && (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Kết quả
                  </p>
                  <div className="space-y-1">
                    {searchResults.map((user) => {
                      const isSelected = selectedUsers.some(
                        (u) => u.id === user.id,
                      );
                      return (
                        <button
                          key={user.id}
                          onClick={() => toggleUserSelection(user)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : "hover:bg-gray-50 dark:hover:bg-[#3a3b3c]"
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={
                                buildS3Url(user.avatarUrl) ||
                                "https://via.placeholder.com/44"
                              }
                              alt={user.username}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-[#242526]">
                                <CheckCircle size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold dark:text-white text-[15px] truncate">
                              {user.name || user.username}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{user.username}
                            </p>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle size={14} className="text-white" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedUsers.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Đã chọn {selectedUsers.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 pl-1 pr-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                      >
                        <img
                          src={
                            buildS3Url(user.avatarUrl) ||
                            "https://via.placeholder.com/24"
                          }
                          alt={user.username}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium">
                          @{user.username}
                        </span>
                        <button
                          onClick={() =>
                            setSelectedUsers((prev) =>
                              prev.filter((u) => u.id !== user.id),
                            )
                          }
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role */}
              <div>
                <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Vai trò
                </p>
                <div className="flex flex-wrap gap-2">
                  {PAGE_ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                        selectedRole === role.value
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#4e4f50]"
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-[#3a3b3c]">
              <button
                onClick={handleAddMembers}
                disabled={selectedUsers.length === 0 || isAddingMembers}
                className={`w-full py-3 rounded-xl text-[15px] font-bold transition-all ${
                  selectedUsers.length === 0 || isAddingMembers
                    ? "bg-gray-100 dark:bg-[#3a3b3c] text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]"
                }`}
              >
                {isAddingMembers ? (
                  <Loader2 className="animate-spin mx-auto" size={20} />
                ) : (
                  `Thêm ${selectedUsers.length > 0 ? selectedUsers.length + " " : ""}thành viên`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close more menu */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!isCreatingPost) {
                setShowCreatePostModal(false);
                setCreatePostContent("");
                setCreatePostImages([]);
                setCreatePostImageInput("");
              }
            }}
          />
          <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#242526] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3a3b3c]">
              <div>
                <h2 className="text-xl font-bold dark:text-white text-center flex-1">
                  Tạo bài viết
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                  Đăng lên ·{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {page.name}
                  </span>
                  {!isOwnerOrAdmin && (
                    <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                      (cần duyệt)
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isCreatingPost) {
                    setShowCreatePostModal(false);
                    setCreatePostContent("");
                    setCreatePostImages([]);
                    setCreatePostImageInput("");
                  }
                }}
                className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-[#3a3b3c] rounded-full hover:bg-gray-200 dark:hover:bg-[#4e4f50] transition-colors"
              >
                <X size={18} className="dark:text-white" />
              </button>
            </div>

            {/* Author row */}
            <div className="flex items-center gap-3 px-5 pt-4">
              <img
                src={
                  buildS3Url(currentUser?.avatarUrl) ||
                  "https://via.placeholder.com/40"
                }
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold dark:text-white text-[15px]">
                  {(currentUser as any)?.name ||
                    (currentUser as any)?.username ||
                    "Bạn"}
                </p>
                <div className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-[#3a3b3c] text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full w-fit">
                  {isOwnerOrAdmin ? <Globe size={11} /> : <Clock size={11} />}
                  <span>{isOwnerOrAdmin ? "Công khai" : "Chờ duyệt"}</span>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {/* Content textarea */}
              <textarea
                autoFocus
                value={createPostContent}
                onChange={(e) => setCreatePostContent(e.target.value)}
                placeholder={`Bạn đang nghĩ gì, ${(currentUser as any)?.name || (currentUser as any)?.username || "bạn"}?`}
                className="w-full min-h-[120px] resize-none bg-transparent text-gray-900 dark:text-white text-[17px] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none leading-relaxed"
                disabled={isCreatingPost}
              />

              {/* Image URLs section */}
              <div className="border border-gray-200 dark:border-[#3a3b3c] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-[#3a3b3c]">
                  <ImageIcon
                    size={18}
                    className="text-green-500 flex-shrink-0"
                  />
                  <span className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                    Thêm ảnh qua URL
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createPostImageInput}
                      onChange={(e) => setCreatePostImageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      placeholder="Dán URL ảnh vào đây..."
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-[#242526] border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isCreatingPost}
                    />
                    <button
                      onClick={handleAddImageUrl}
                      disabled={!createPostImageInput.trim() || isCreatingPost}
                      className="flex items-center justify-center w-9 h-9 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {createPostImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {createPostImages.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-[#3a3b3c] aspect-square"
                        >
                          <img
                            src={buildS3Url(url) || url}
                            alt={`img-${idx}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/100?text=!";
                            }}
                          />
                          <button
                            onClick={() =>
                              setCreatePostImages((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer / Submit */}
            <div className="px-5 py-4 border-t border-gray-200 dark:border-[#3a3b3c]">
              <button
                onClick={handleCreatePost}
                disabled={
                  (!createPostContent.trim() &&
                    createPostImages.length === 0) ||
                  isCreatingPost
                }
                className={`w-full py-3 rounded-xl text-[15px] font-bold transition-all ${
                  (!createPostContent.trim() &&
                    createPostImages.length === 0) ||
                  isCreatingPost
                    ? "bg-gray-100 dark:bg-[#3a3b3c] text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]"
                }`}
              >
                {isCreatingPost ? (
                  <Loader2 className="animate-spin mx-auto" size={20} />
                ) : isOwnerOrAdmin ? (
                  "Đăng bài"
                ) : (
                  "Gửi bài (chờ duyệt)"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PostCard component
function PostCard({
  post,
  page,
  isOwnerOrAdmin,
  postActionLoading,
  onRemove,
}: {
  post: Post;
  page: Page;
  isOwnerOrAdmin: boolean;
  postActionLoading: string | null;
  onRemove: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm overflow-hidden">
      {/* Post Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <img
            src={buildS3Url(page.avatarUrl) || "https://via.placeholder.com/44"}
            alt={page.name}
            className="w-11 h-11 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold dark:text-white text-[15px] hover:underline cursor-pointer">
              {page.name}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-[13px]">
              {timeAgo(post.createdAt)}
              <span className="ml-1">·</span>
              <span className="ml-1">
                <Globe size={11} className="inline" />
              </span>
            </p>
          </div>
        </div>
        {isOwnerOrAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-full transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-10 w-52 bg-white dark:bg-[#3a3b3c] rounded-xl shadow-xl border border-gray-200 dark:border-[#4e4f50] z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      onRemove(post._id);
                      setShowMenu(false);
                    }}
                    disabled={postActionLoading === post._id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-[15px]"
                  >
                    <Trash2 size={18} />
                    Xóa bài viết
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed whitespace-pre-line">
            {post.content}
          </p>
        </div>
      )}

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <div
          className={`grid gap-0.5 ${
            post.images.length === 1
              ? "grid-cols-1"
              : post.images.length === 2
                ? "grid-cols-2"
                : post.images.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2"
          }`}
        >
          {post.images
            .slice(0, post.images.length === 4 ? 4 : 5)
            .map((img, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden bg-black ${
                  post.images!.length === 3 && idx === 0 ? "col-span-2" : ""
                }`}
              >
                <img
                  src={buildS3Url(img) || img}
                  alt={`Post image ${idx + 1}`}
                  className={`w-full object-cover cursor-pointer hover:opacity-95 transition-opacity ${
                    post.images!.length === 1
                      ? "max-h-[500px]"
                      : post.images!.length === 2
                        ? "h-[300px]"
                        : "h-[200px]"
                  }`}
                />
                {idx === 4 && post.images!.length > 5 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer">
                    <span className="text-white text-2xl font-bold">
                      +{post.images!.length - 5}
                    </span>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Stats row */}
      {post.likesCount || post.commentsCount ? (
        <div className="flex items-center justify-between px-4 py-2 text-gray-500 dark:text-gray-400 text-[13px]">
          {post.likesCount ? (
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <ThumbsUp size={12} className="text-white" />
              </span>
              <span>{post.likesCount.toLocaleString()}</span>
            </div>
          ) : (
            <div />
          )}
          {post.commentsCount ? (
            <span>{post.commentsCount.toLocaleString()} bình luận</span>
          ) : null}
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="flex border-t border-gray-100 dark:border-[#3a3b3c] mx-4 py-1">
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-lg transition-colors text-[15px] font-semibold">
          <ThumbsUp size={20} />
          Thích
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-lg transition-colors text-[15px] font-semibold">
          <MessageCircle size={20} />
          Bình luận
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-lg transition-colors text-[15px] font-semibold">
          <Share2 size={20} />
          Chia sẻ
        </button>
      </div>
    </div>
  );
}
