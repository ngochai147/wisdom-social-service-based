package iuh.fit.edu.backend.modules.user.service;

import java.util.List;

/**
 * Narrow read-only shim cua FriendService cho content-service.
 *
 * <p>Chi expose method duoc cac module content goi de loc theo quan he ban be.</p>
 */
public interface FriendService {

    List<Long> getAcceptedFriendIds(long userId);
}
