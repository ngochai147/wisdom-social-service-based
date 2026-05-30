package iuh.fit.edu.backend.common.service.security.impl;

import iuh.fit.edu.backend.modules.user.entity.User;
import iuh.fit.edu.backend.modules.user.repository.UserRepository;
import iuh.fit.edu.backend.common.service.security.AccountLockService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class AccountLockServiceImpl implements AccountLockService {

    private final UserRepository userRepository;

    public AccountLockServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void systemLock(User user, String reason, int lockMinutes) {
        user.setLocked(true);
        user.setLockedAt(OffsetDateTime.now());
        user.setLockReason(reason);
        user.setLockedUntil(OffsetDateTime.now().plus(lockMinutes, ChronoUnit.MINUTES));
        user.setLockedBy("SYSTEM");
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void adminLock(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setLocked(true);
        user.setLockedAt(OffsetDateTime.now());
        user.setLockReason(reason);
        user.setLockedUntil(null);
        user.setLockedBy("ADMIN");
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void adminUnlock(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setLocked(false);
        user.setLockedAt(null);
        user.setLockReason(null);
        user.setLockedUntil(null);
        user.setLockedBy(null);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public boolean isLocked(User user) {
        if (!user.isLocked()) {
            return false;
        }
        if (user.getLockedUntil() != null && OffsetDateTime.now().isAfter(user.getLockedUntil())) {
            user.setLocked(false);
            user.setLockedAt(null);
            user.setLockReason(null);
            user.setLockedUntil(null);
            user.setLockedBy(null);
            userRepository.save(user);
            return false;
        }
        return true;
    }

    @Override
    public long getRemainingLockSeconds(User user) {
        if (!user.isLocked()) return 0;
        if (user.getLockedUntil() == null) return -1; // permanent lock
        long remaining = ChronoUnit.SECONDS.between(OffsetDateTime.now(), user.getLockedUntil());
        return Math.max(remaining, 0);
    }
}
