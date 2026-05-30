package iuh.fit.edu.backend.modules.user.service.impl;

import iuh.fit.edu.backend.modules.user.entity.BlockedUser;
import iuh.fit.edu.backend.modules.user.service.BlockUserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * REST stub cua {@link BlockUserService} cho content-service.
 *
 * <p>Hanh dong block/unblock duoc uy thac sang user-service qua REST
 * ({@code POST/DELETE ${user.service.base-url}/internal/blocks}). Loi mang / HTTP
 * duoc nuot (log.warn) va tra ve {@code false} de KHONG lam fail nghiep vu content.
 * Day la muc compile-level; provider endpoint se duoc them sau.</p>
 */
@Service
@Slf4j
public class RemoteBlockUserServiceImpl implements BlockUserService {

    private final RestClient restClient;

    public RemoteBlockUserServiceImpl(
            @Value("${user.service.base-url:http://localhost:8082}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl + "/internal/blocks")
                .build();
    }

    @Override
    public boolean blockUser(BlockedUser blockedUser) {
        try {
            restClient.post()
                    .body(blockedUser)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (ResourceAccessException ex) {
            log.warn("User service unreachable during blockUser: {}", ex.getMessage());
            return false;
        } catch (RestClientException ex) {
            log.warn("blockUser remote call failed: {}", ex.getMessage());
            return false;
        }
    }

    @Override
    public boolean cancelBlockUser(BlockedUser blockedUser) {
        try {
            restClient.method(org.springframework.http.HttpMethod.DELETE)
                    .body(blockedUser)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (ResourceAccessException ex) {
            log.warn("User service unreachable during cancelBlockUser: {}", ex.getMessage());
            return false;
        } catch (RestClientException ex) {
            log.warn("cancelBlockUser remote call failed: {}", ex.getMessage());
            return false;
        }
    }
}
