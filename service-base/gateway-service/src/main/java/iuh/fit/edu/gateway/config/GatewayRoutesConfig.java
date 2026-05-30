package iuh.fit.edu.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Khai bao route bang Java (RouteLocatorBuilder) thay vi YAML de on dinh qua cac ban
 * Spring Cloud Gateway va de doc mapping path -> service.
 *
 * <p>Cac path lay tu {@code @RequestMapping} THAT cua tung service trong service-base
 * (xem README.md). URI dich cau hinh qua bien moi truong, mac dinh tro ve localhost de
 * chay local; khi chay docker-compose thi override bang ten container.
 */
@Configuration
public class GatewayRoutesConfig {

    @Value("${gateway.uri.user-chat}")
    private String userChatUri;

    @Value("${gateway.uri.content}")
    private String contentUri;

    @Value("${gateway.uri.notification}")
    private String notificationUri;

    @Value("${gateway.uri.ai}")
    private String aiUri;

    @Value("${gateway.uri.media}")
    private String mediaUri;

    @Bean
    public RouteLocator gatewayRoutes(RouteLocatorBuilder builder) {
        return builder.routes()

                // ===== ai-service (8085) =====
                // DAT TRUOC user-chat: /api/users/me/confirm-ai phai ve ai-service,
                // dung de bi /api/users/** cua user-chat "nuot" mat.
                .route("ai", r -> r
                        .path(
                                "/api/ai/**",
                                "/api/users/me/confirm-ai/**")
                        .uri(aiUri))

                // ===== user-chat-service (8082): user + auth + chat + conversation =====
                .route("user-chat", r -> r
                        .path(
                                "/api/auth/**",
                                "/api/admin/**",
                                "/api/chat-users/**",
                                "/api/users/status/**",
                                "/api/device-settings/**",
                                "/api/friends/**",
                                "/api/conversations/**",
                                "/api/messages/**",
                                "/api/pins/**",
                                "/api/polls/**",
                                "/api/session/**")
                        .uri(userChatUri))

                // WebSocket / SockJS (chat, presence, notification realtime) o user-chat-service
                .route("user-chat-ws", r -> r
                        .path("/ws/**", "/ws-native/**")
                        .uri(userChatUri))

                // ===== content-service (8083): post + page + story + note + music =====
                .route("content", r -> r
                        .path(
                                "/api/posts/**",
                                "/api/post-shares/**",
                                "/api/saved-posts/**",
                                "/api/reactions/**",
                                "/api/comments/**",
                                "/api/hashtags/**",
                                "/api/page/**",
                                "/api/page-member/**",
                                "/api/stories/**",
                                "/api/notes/**",
                                "/api/music/**")
                        .uri(contentUri))

                // ===== notification-service (8084) =====
                .route("notification", r -> r
                        .path("/api/notifications/**")
                        .uri(notificationUri))

                // ===== media-service (8081) =====
                // FE goi /api/media/** ; media-service expose /internal/media/** -> rewrite path.
                .route("media", r -> r
                        .path("/api/media/**")
                        .filters(f -> f.rewritePath("/api/media/(?<segment>.*)", "/internal/media/${segment}"))
                        .uri(mediaUri))

                // FE MediaViewer goi truc tiep /api/files/download de luu anh.
                .route("media-files", r -> r
                        .path("/api/files/download")
                        .filters(f -> f.rewritePath("/api/files/download", "/internal/media/download"))
                        .uri(mediaUri))

                .build();
    }
}
