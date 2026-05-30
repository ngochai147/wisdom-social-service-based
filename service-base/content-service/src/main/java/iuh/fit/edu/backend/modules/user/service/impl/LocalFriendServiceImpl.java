package iuh.fit.edu.backend.modules.user.service.impl;

import iuh.fit.edu.backend.modules.user.constant.FriendStatus;
import iuh.fit.edu.backend.modules.user.repository.FriendRepository;
import iuh.fit.edu.backend.modules.user.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Hien thuc local cua {@link FriendService} cho content-service.
 *
 * <p>Doc tu DB dung chung qua {@link FriendRepository} - KHONG goi REST.
 * Replicate dung logic goc trong FriendServiceImpl#getAcceptedFriendIds.</p>
 */
@Service
@RequiredArgsConstructor
public class LocalFriendServiceImpl implements FriendService {

    private final FriendRepository friendRepository;

    @Override
    public List<Long> getAcceptedFriendIds(long userId) {
        if (userId <= 0) {
            return Collections.emptyList();
        }
        return friendRepository.findAcceptedFriendIds(userId, FriendStatus.ACCEPTED.ordinal());
    }
}
