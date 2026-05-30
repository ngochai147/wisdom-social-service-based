# gateway-service (8080) — API Gateway cho frontend-web

Entry-point **duy nhat** cho `frontend-web`. Frontend gọi mọi thứ qua `/api/**` (REST) và
`/ws` (SockJS/WebSocket) tới `http://localhost:8080`; gateway route sang đúng microservice.

> Vì sao 8080? `frontend-web/.env.development` đặt `VITE_DEV_PROXY_TARGET=http://localhost:8080`
> và prod dùng `/api` + `/ws` (same-origin). Gateway đứng ở 8080 nên **không cần sửa frontend**.

Stack: Spring Boot 3.5.6 + Spring Cloud Gateway 2025.0.0 (reactive/WebFlux), Java 21.

## Bảng route (lấy từ `@RequestMapping` thật của từng service trong service-base)

| Path (FE gọi) | Service đích | Port |
|---|---|---|
| `/api/ai/**`, `/api/users/me/confirm-ai/**` | ai-service | 8085 |
| `/api/auth/**`, `/api/admin/**`, `/api/chat-users/**`, `/api/users/status/**`, `/api/device-settings/**`, `/api/friends/**`, `/api/conversations/**`, `/api/messages/**`, `/api/pins/**`, `/api/polls/**`, `/api/session/**` | user-chat-service | 8082 |
| `/ws/**`, `/ws-native/**` (SockJS/WebSocket) | user-chat-service | 8082 |
| `/api/posts/**`, `/api/post-shares/**`, `/api/saved-posts/**`, `/api/reactions/**`, `/api/comments/**`, `/api/hashtags/**`, `/api/page/**`, `/api/page-member/**`, `/api/stories/**`, `/api/notes/**`, `/api/music/**` | content-service | 8083 |
| `/api/notifications/**` | notification-service | 8084 |
| `/api/media/**` → rewrite `/internal/media/**` | media-service | 8081 |

> **Thứ tự quan trọng**: route `ai` đặt trước `user-chat` vì `/api/users/me/confirm-ai`
> phải về ai-service, đừng để `/api/users/status` (user-chat) nuốt nhầm. Hai path này rời nhau
> nên thực tế không đụng, nhưng vẫn giữ thứ tự cho an toàn.
>
> `media-service` chỉ expose `/internal/media/**`; gateway rewrite `/api/media/{x}` → `/internal/media/{x}`.
>
> Chưa có backend trong service-base: **block** (`/api/v1/blocks` — PLAN ghi `/internal/blocks` chưa hiện thực).
> Nếu frontend gọi tới sẽ 404 cho tới khi service implement; thêm route 1 dòng khi có.

Định nghĩa route ở [GatewayRoutesConfig.java](src/main/java/iuh/fit/edu/gateway/config/GatewayRoutesConfig.java).
CORS tập trung ở [CorsConfig.java](src/main/java/iuh/fit/edu/gateway/config/CorsConfig.java).

## URI service đích (cấu hình)

Mặc định trỏ `localhost` (chạy local). Override bằng env khi chạy nơi khác:

| Env | Mặc định |
|---|---|
| `USER_CHAT_URI` | `http://localhost:8082` |
| `CONTENT_URI` | `http://localhost:8083` |
| `NOTIFICATION_URI` | `http://localhost:8084` |
| `AI_URI` | `http://localhost:8085` |
| `MEDIA_URI` | `http://localhost:8081` |
| `SERVER_PORT` | `8080` |

`docker-compose.yml` đã set sẵn các URI này trỏ về tên container.

## Chạy

```bash
# Local (cần 5 service kia đang chạy, vd qua start-all.sh)
cd gateway-service && ./mvnw spring-boot:run     # hoặc: SERVER_PORT=8080 ../mvnw spring-boot:run

# Docker (chạy cả cụm + gateway)
docker compose up --build
```

Kiểm tra: `GET http://localhost:8080/actuator/gateway/routes` (liệt kê route), `…/actuator/health`.

Sau đó chạy frontend: `cd frontend-web && npm install && npm run dev` → FE proxy `/api` + `/ws`
về `http://localhost:8080` (gateway).
