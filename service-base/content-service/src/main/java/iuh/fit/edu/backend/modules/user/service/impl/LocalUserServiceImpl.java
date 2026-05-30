package iuh.fit.edu.backend.modules.user.service.impl;

import iuh.fit.edu.backend.common.service.security.CurrentUserService;
import iuh.fit.edu.backend.modules.user.entity.User;
import iuh.fit.edu.backend.modules.user.repository.UserRepository;
import iuh.fit.edu.backend.modules.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Hien thuc local cua {@link UserService} cho content-service.
 *
 * <p>Doc tu DB dung chung qua repository - KHONG goi REST sang user-service.
 * {@code getCurrentUser()} uy thac cho {@link CurrentUserService} (common-core),
 * {@code findUserById(long)} replicate dung logic goc:
 * {@code userRepository.findById(id).orElse(null)}.</p>
 */
@Service
@RequiredArgsConstructor
public class LocalUserServiceImpl implements UserService {

    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;

    @Override
    public User getCurrentUser() {
        return currentUserService.getCurrentUser();
    }

    @Override
    public User findUserById(long id) {
        return userRepository.findById(id).orElse(null);
    }
}
