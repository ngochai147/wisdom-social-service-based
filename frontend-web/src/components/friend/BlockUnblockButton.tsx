import { useState, useEffect, useCallback } from "react";
import { Ban, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import blockService from "../../services/blockService";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import ConfirmModal from "../common/ConfirmModal";

interface BlockUnblockButtonProps {
    userId: number;
    username: string;
    // Optional: pre-loaded block status (to avoid extra API call)
    initialIsBlocked?: boolean;
    // If true, skip the initial API check (use when parent already loaded the status)
    skipInitialCheck?: boolean;
    // Callback when block status changes
    onBlockStatusChange?: (userId: number, isBlocked: boolean) => void;
}

export default function BlockUnblockButton({ 
    userId, 
    username,
    initialIsBlocked,
    skipInitialCheck = false,
    onBlockStatusChange,
}: BlockUnblockButtonProps) {
    const currentUser = useCurrentUser();
    const [isBlocked, setIsBlocked] = useState(initialIsBlocked ?? false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(!skipInitialCheck);
    const [showConfirm, setShowConfirm] = useState(false);

    const checkBlockStatus = useCallback(async () => {
        // Skip if parent already provided the status
        if (skipInitialCheck) {
            setChecking(false);
            return;
        }
        
        // Wait for currentUser - keep checking state as true
        if (!currentUser?.id) {
            return;
        }

        setChecking(true);
        try {
            // Get list of blocked users and check if this user is in it
            const blockedUsers = await blockService.getBlockedUsers(currentUser.id);
            const blocked = blockedUsers.some((u) => u.id === userId);
            setIsBlocked(blocked);
        } catch (error) {
            console.error("Error checking block status:", error);
        } finally {
            setChecking(false);
        }
    }, [currentUser?.id, userId, skipInitialCheck]);

    useEffect(() => {
        checkBlockStatus();
    }, [checkBlockStatus]);

    // Update isBlocked when initialIsBlocked prop changes
    useEffect(() => {
        if (initialIsBlocked !== undefined) {
            setIsBlocked(initialIsBlocked);
        }
    }, [initialIsBlocked]);

    const handleBlockUnblock = useCallback(() => {
        if (!currentUser?.id) {
            toast.error("Vui lòng đăng nhập để thực hiện hành động này");
            return;
        }
        setShowConfirm(true);
    }, [currentUser]);

    const doBlockUnblock = useCallback(async () => {
        if (!currentUser?.id) return;
        setShowConfirm(false);
        const action = isBlocked ? "bỏ chặn" : "chặn";
        setLoading(true);
        try {
            if (isBlocked) {
                await blockService.unblockUser(currentUser.id, userId);
                setIsBlocked(false);
                onBlockStatusChange?.(userId, false);
                toast.success(`Đã bỏ chặn ${username}`);
            } else {
                await blockService.blockUser(currentUser.id, userId);
                setIsBlocked(true);
                onBlockStatusChange?.(userId, true);
                toast.success(`Đã chặn ${username}`);
            }
        } catch (error: any) {
            console.error("Error block/unblock user:", error);
            toast.error(`Không thể ${action} người dùng. Vui lòng thử lại.`);
        } finally {
            setLoading(false);
        }
    }, [currentUser, isBlocked, userId, username, onBlockStatusChange]);

    // Render a real <button> as placeholder so parent CSS that targets `button`
    // (e.g. ProfileHeader's `[&>button]:!w-[34px]`) keeps the size consistent.
    if (!currentUser || checking) {
        return (
            <button
                type="button"
                disabled
                className="px-4 py-[7px] rounded-lg bg-gray-200 dark:bg-[#363636] flex items-center justify-center"
            >
                <Loader2 className="animate-spin" size={16} />
            </button>
        );
    }

    return (
        <>
        <ConfirmModal
            open={showConfirm}
            title={isBlocked ? "Bỏ chặn người dùng" : "Chặn người dùng"}
            message={`Bạn có chắc chắn muốn ${isBlocked ? "bỏ chặn" : "chặn"} "${username}"?`}
            confirmText={isBlocked ? "Bỏ chặn" : "Chặn"}
            cancelText="Hủy"
            variant={isBlocked ? "warning" : "danger"}
            onConfirm={doBlockUnblock}
            onCancel={() => setShowConfirm(false)}
        />
        <button
            onClick={handleBlockUnblock}
            disabled={loading}
            className={`px-4 py-[7px] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                isBlocked
                    ? "bg-gray-500 hover:bg-gray-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
            }`}
        >
            {loading ? (
                <Loader2 className="animate-spin" size={16} />
            ) : (
                <Ban size={16} />
            )}
            <span>{isBlocked ? "Unblock" : "Block"}</span>
        </button>
        </>
    );
}
