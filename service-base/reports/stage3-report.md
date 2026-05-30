# Báo cáo Stage 3 — gộp chat + conversation vào user → user-chat-service

## Quyết định
chat ↔ conversation ↔ user coupling 2 chiều, mịn (đặc biệt `userService.getCurrentUser()` gọi **53 lần**,
`UserPresenceService` 7 method, `InternalUserServiceImpl.getReferenceById`). Tách riêng chat-service sẽ phải
viết lại current-user resolution cục bộ — rủi ro cao. → User chọn **gộp {user, chat, conversation} = 1 service**.

## Đã làm (compile BUILD SUCCESS)
- Đổi tên `user-service` → **`user-chat-service`** (folder + pom artifactId/name + spring.application.name).
- Copy `modules/chat` (55) + `modules/conversation` (60) từ backend vào service (giữ package).
- Khôi phục `ChatUserSearchServiceImpl.java` về bản gốc backend (dùng `DirectConversationService` — giờ đã có nội bộ vì conversation nằm cùng service), bỏ hack inline buildDirectKey ở Stage 2.
- Tổng: **174 file java** (user + chat + conversation + RemoteMediaStorageAdapter).
- `test-compile` (offline): **BUILD SUCCESS** (exit 0).

## Coupling sau khi gộp
- Dep ngoài DUY NHẤT của cụm {user,chat,conversation} = `MediaStoragePort` (2 ref) → đã có `RemoteMediaStorageAdapter` (REST → media-service). **Không còn cross-service nào khác.**
- Mọi tham chiếu user↔chat↔conversation giờ là nội bộ (in-process) → không cần REST, đúng vì coupling chặt.

## Lưu ý
- `modules/user`, `modules/chat`, `modules/conversation` vẫn còn trong backend (strangler) — backend tiếp tục phục vụ tới khi cắt hẳn.
- Chưa runtime-test (cần DB/Mongo/Redis/Cognito/AWS). Service component-scan `iuh.fit.edu.backend` → nạp config common-core (websocket/redis/mongo/...): phù hợp vì cụm này có realtime chat + presence.
- Port dự kiến: user-chat-service 8082, media-service 8081.

## Trạng thái service
- media-service ✅ (8081)
- user-chat-service ✅ (8082) = user + chat + conversation
- content (post+page+story+note+music) ⬜
- notification ⬜
- ai ⬜
