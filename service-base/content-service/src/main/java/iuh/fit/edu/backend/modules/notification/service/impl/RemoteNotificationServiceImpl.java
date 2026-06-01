package iuh.fit.edu.backend.modules.notification.service.impl;

import iuh.fit.edu.backend.modules.notification.event.payload.NotificationEvent;
import iuh.fit.edu.backend.modules.notification.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
@Slf4j
public class RemoteNotificationServiceImpl implements NotificationService {

    private final RestClient restClient;

    public RemoteNotificationServiceImpl(
            @Value("${notification.service.base-url:http://localhost:8084}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl + "/internal/notifications")
                .build();
    }

    @Override
    public void createNotification(NotificationEvent event) {
        try {
            restClient.post()
                    .body(event)
                    .retrieve()
                    .toBodilessEntity();
        } catch (ResourceAccessException ex) {
            log.warn("Notification service unreachable during createNotification: {}", ex.getMessage());
        } catch (RestClientException ex) {
            log.warn("createNotification remote call failed: {}", ex.getMessage());
        }
    }
}
