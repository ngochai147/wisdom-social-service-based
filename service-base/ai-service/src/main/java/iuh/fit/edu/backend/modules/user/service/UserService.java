package iuh.fit.edu.backend.modules.user.service;

import iuh.fit.edu.backend.modules.user.entity.User;

/**
 * Local shim for the ai-service. Only the methods actually used by the ai module
 * are declared here. Backed by common-core CurrentUserService (no REST call).
 */
public interface UserService {
    User getCurrentUser();
}
