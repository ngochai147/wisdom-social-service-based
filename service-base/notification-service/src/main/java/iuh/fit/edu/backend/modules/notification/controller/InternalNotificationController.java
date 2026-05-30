package iuh.fit.edu.backend.modules.notification.controller;

import iuh.fit.edu.backend.modules.notification.event.payload.NotificationEvent;
import iuh.fit.edu.backend.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal provider endpoint cho cac service khac (vi du content-service).
 *
 * <p>Nhan {@link NotificationEvent} qua REST va uy thac cho
 * {@link NotificationService#createNotification(NotificationEvent)}.
 * Tra 202 Accepted vi viec xu ly notification la bat dong bo (publish event).</p>
 */
@RestController
@RequestMapping("/internal/notifications")
@RequiredArgsConstructor
@Slf4j
public class InternalNotificationController {

    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<Void> createNotification(@RequestBody NotificationEvent event) {
        log.info("Received internal NotificationEvent for recipient: {}", event.getRecipientId());
        notificationService.createNotification(event);
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }
}
