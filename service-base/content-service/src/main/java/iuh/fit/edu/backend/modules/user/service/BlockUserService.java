package iuh.fit.edu.backend.modules.user.service;

import iuh.fit.edu.backend.modules.user.entity.BlockedUser;

/**
 * Narrow write shim cua BlockUserService cho content-service.
 *
 * <p>Hanh dong block/unblock thuoc so huu cua user-service; content-service
 * uy thac qua REST. Chi expose cac method duoc module content goi.</p>
 */
public interface BlockUserService {

    boolean blockUser(BlockedUser blockedUser);

    boolean cancelBlockUser(BlockedUser blockedUser);
}
