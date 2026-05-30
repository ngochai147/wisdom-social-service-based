# service-base — Workspace tách microservices

Tách backend monolith thành **5 service độc lập + 3 lib nền** (chung DB, REST). Tất cả **compile BUILD SUCCESS**. Xem **[PLAN.md](PLAN.md)**.

### 3 lib nền (shared, install .m2)
- **`common-lib/`** (6) — contract: DTO/constant/media-exception + MediaStoragePort.
- **`persistence-lib/`** (109) — entity + repository + constant + converter (chung 1 DB).
- **`common-core/`** (46) — infra: config/security/exception/util/event + CurrentUserService.

### 5 service (mỗi cái 1 Maven project, port riêng)
- **`media-service/`** (8081) — S3 storage, stateless.
- **`user-chat-service/`** (8082) — user + chat + conversation (174 file).
- **`content-service/`** (8083) — post+page+story+note+music (96).
- **`notification-service/`** (8084) — notification, expose `/internal/notifications`.
- **`ai-service/`** (8085) — ai (+webflux).

`reports/` — báo cáo từng stage. `../backend` — monolith gốc giữ nguyên (strangler), đã refactor để dùng 3 lib + boundary media.

> ⚠️ Mới verify tới **compile**. Chưa runtime-test (cần MariaDB/Mongo/Redis/Cognito/AWS). REST stub block/notification cần provider chạy.

> Phase đầu (dưới đây) là chuẩn bị boundary `MediaStoragePort` **in-place** trên `../backend`.
> Phase sau (PLAN.md) tách thành project Maven độc lập trong folder này.

---

## Bối cảnh thực tế (đã khảo sát)

- Backend: `../backend` — Spring Boot, 438 file Java, KHÔNG phải git repo.
- `S3Service`: `common/service/s3/S3Service.java` — interface 11 method (phức tạp hơn
  signature gợi ý trong Agent1.md). Adapter/port phải khớp với contract thật này.
- 11 file tham chiếu `S3Service`:
  - **Agent 1 (boundary):** `modules/media/controller/FileController.java`,
    `common/service/s3/S3Service.java` (giữ nguyên), `common/service/s3/impl/S3ServiceImpl.java` (giữ nguyên).
  - **Agent 2 (business callers):**
    - user: `controller/UserController.java`
    - chat: `service/impl/MessageCommandService.java`
    - story: `service/impl/StoryServiceImpl.java`, `controller/StoryController.java`
    - post: `service/impl/PostServiceImpl.java`, `controller/PostController.java`
    - page: `service/impl/PageServiceImpl.java`, `controller/PageController.java`

## Thứ tự thực thi (ORCHESTRATION.md)

1. Agent 1 — tạo `MediaStoragePort`, `S3MediaStorageAdapter`, media exceptions, refactor `FileController`,
   cập nhật `GlobalExceptionHandler`. → báo cáo: `reports/agent1-report.md`
2. Verify Agent 1 tạo xong `MediaStoragePort`.
3. Agent 2 — refactor 8 file business để gọi qua `MediaStoragePort`. → báo cáo: `reports/agent2-report.md`
4. Verify toàn cục + compile.

## Trạng thái — HOÀN THÀNH (2026-05-29)

- [x] Agent 1 — port/adapter/exceptions/FileController/GlobalExceptionHandler → `reports/agent1-report.md`
- [x] Verify boundary — FileController không còn S3Service, 4 file boundary tồn tại
- [x] Agent 2 — refactor 8 file business → `reports/agent2-report.md`
- [x] Verify cuối + compile — `mvnw.cmd -o test-compile` = BUILD SUCCESS

### Kết quả verify cuối (theo ORCHESTRATION.md)

- `S3Service` trong business modules: **KHÔNG còn** (chỉ còn trong `modules/media/infrastructure/S3MediaStorageAdapter`).
- `common.service.s3` trong modules: chỉ còn ở adapter (hợp lệ).
- `modules.media.infrastructure` bị business import: **KHÔNG**.
- `MediaStoragePort` được inject ở: media (FileController, adapter, port), chat/MessageCommandService,
  post (controller + serviceImpl), story (controller + serviceImpl), user/UserController, page/PageController.
- `modules/page/PageServiceImpl`: S3Service vốn được inject nhưng không dùng → đã gỡ bỏ hẳn (không cần port).
