package iuh.fit.edu.backend.modules.user.service;

import iuh.fit.edu.backend.modules.user.entity.User;

/**
 * Narrow read-only shim cua UserService cho content-service.
 *
 * <p>content-service khong so huu module user; chi can doc thong tin user
 * tu DB dung chung. Chi expose cac method ma cac module post/page/story/note/music
 * thuc su goi.</p>
 */
public interface UserService {

    User getCurrentUser();

    User findUserById(long id);
}
