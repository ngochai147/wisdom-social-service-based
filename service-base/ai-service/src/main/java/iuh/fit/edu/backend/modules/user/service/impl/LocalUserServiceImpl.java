package iuh.fit.edu.backend.modules.user.service.impl;

import iuh.fit.edu.backend.common.service.security.CurrentUserService;
import iuh.fit.edu.backend.modules.user.entity.User;
import iuh.fit.edu.backend.modules.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Local (in-process) implementation of {@link UserService} for the ai-service.
 * Resolves the current authenticated user via common-core {@link CurrentUserService}
 * which reads from the shared DB (persistence-lib). No remote/REST dependency.
 */
@Service
@RequiredArgsConstructor
public class LocalUserServiceImpl implements UserService {

    private final CurrentUserService currentUserService;

    @Override
    public User getCurrentUser() {
        return currentUserService.getCurrentUser();
    }
}
