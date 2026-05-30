package iuh.fit.edu.backend.modules.user.repository;

import iuh.fit.edu.backend.modules.user.entity.ActiveToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActiveTokenRepository extends JpaRepository<ActiveToken, Long> {
    List<ActiveToken> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
