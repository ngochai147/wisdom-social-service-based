package iuh.fit.edu.backend.modules.user.service;

import iuh.fit.edu.backend.modules.user.entity.User;

/**
 * Narrow read-only shim cua UserService cho notification-service.
 *
 * <p>notification-service khong so huu module user; chi can doc thong tin user
 * tu DB dung chung. Chi expose cac method ma module notification thuc su goi
 * ({@code getCurrentUser()} va {@code findUserById(long)}).</p>
 */
public interface UserService {

    User getCurrentUser();

    User findUserById(long id);
}
