package iuh.fit.edu.backend.modules.notification.service;

import iuh.fit.edu.backend.modules.notification.event.payload.NotificationEvent;

/**
 * Narrow write shim cua NotificationService cho content-service.
 *
 * <p>content-service chi build payload va day sang notification-service.
 * Chi expose method ma cac module content goi.</p>
 */
public interface NotificationService {

    void createNotification(NotificationEvent event);
}
