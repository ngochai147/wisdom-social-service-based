package iuh.fit.edu.backend.common.service.security;

import iuh.fit.edu.backend.modules.user.entity.User;
import iuh.fit.edu.backend.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Resolve user dang dang nhap MOT CACH CUC BO tu SecurityContext (JWT principal),
 * dung chung cho moi service (thay cho viec goi UserService.getCurrentUser() cross-service).
 *
 * <p>Logic giu nguyen nhu {@code UserServiceImpl.getCurrentUser()} goc: lay principal (so dien thoai),
 * chuan hoa +84 -> 0, roi tra User tu DB chung qua {@code UserRepository} (persistence-lib).</p>
 */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }
        try {
            String phone = auth.getPrincipal().toString();
            if (phone.startsWith("+84")) {
                phone = "0" + phone.substring(3);
            }
            return userRepository.findByPhone(phone);
        } catch (Exception e) {
            return null;
        }
    }
}
