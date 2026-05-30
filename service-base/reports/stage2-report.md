# Báo cáo Stage 2 — persistence-lib (foundation) + đánh giá user-service

## Đã làm xong & verify (BUILD SUCCESS)

### persistence-lib — shared persistence kernel
Tạo `service-base/persistence-lib` (Spring Boot 3.5.6 lib, JPA + Mongo + validation + jackson + lombok).
- **Di chuyển 109 file** từ backend (giữ nguyên package `iuh.fit.edu.backend.modules.*` và `common.util.convert`):
  - Toàn bộ `modules/*/entity` (51 entity: 41 JPA + 30 Mongo... gồm cả value object).
  - Toàn bộ `modules/*/repository` (39 repository).
  - Toàn bộ `modules/*/constant` (enum leaf, không kéo theo service/dto).
  - `common/util/convert` (2 JPA converter tham chiếu conversation entity).
- Build + install `.m2`: **BUILD SUCCESS** (sau khi thêm jackson-databind do entity dùng `@JsonIgnore/@JsonProperty/@JsonValue`).

### backend wire persistence-lib
- Thêm dependency `iuh.fit.edu:persistence-lib:0.0.1-SNAPSHOT`.
- Xóa bản gốc 109 file khỏi backend (cùng FQN → mọi import của backend giữ nguyên, không sửa file nào).
- `@EnableJpaRepositories`/`@EnableMongoRepositories(basePackages="iuh.fit.edu.backend.modules")` + entity scan mặc định vẫn quét được vì package không đổi (cùng classpath).
- backend `test-compile`: **BUILD SUCCESS**.

> Đây là blocker cấu trúc lớn nhất đã được giải. Mọi service ở Stage 3-6 sẽ dùng chung persistence-lib này.

## Vì sao chưa tạo xong user-service (checkpoint)

Khảo sát user module (sau khi entity/repo/constant đã sang persistence-lib) còn: controller, service, mapper, dto.
Outbound coupling của nó gần như đã được persistence-lib giải quyết — chỉ còn:
- **Cross-service THẬT (cần REST):** `media.application.MediaStoragePort` (1), `conversation.service.DirectConversationService` (1).
- **Cần shared infra từ `common`:** `ApiResponse`, `ApiMessage`, `service/security/*` (AccountLockService, RateLimitService), `JwtAuthFilter`, `MediaUrlBuilder`, `RateLimitExceededException`, `AccountLockedException`.

→ Để user-service **compile + chạy** được cần thêm:
1. **common-core lib**: extract `common/*` (config, dto, exception, util, service/security...) thành lib dùng chung. `common` rất sạch — chỉ 1 coupling `GlobalExceptionHandler → modules.ai.dto.response.AIErrorResponse` cần gỡ (chuyển AIErrorResponse vào common-lib). Các `common/config` KHÔNG dính module (an toàn compile).
2. **REST stub** cho MediaStoragePort (đã có mẫu RemoteMediaStorageAdapter) và DirectConversationService.
3. **App + config riêng** cho user-service (datasource/redis/mongo/security), port riêng.

Phần (3) là **per-service integration cần chạy thật để verify** (môi trường này không có MariaDB/Mongo/Redis/Cognito) → rủi ro tạo ra service compile được nhưng cấu hình sai mà không phát hiện.

## Khuyến nghị bước tiếp
- **Bước 3a (an toàn, verify bằng compile):** extract `common-core` lib (giống persistence-lib). Sau đó 3 lib nền: common-lib + persistence-lib + common-core; backend compile trên cả ba.
- **Bước 3b:** dựng user-service app trên 3 lib nền + REST stub, compile.
- **Bước 3c (cần môi trường thật):** chạy & chỉnh config.

## Trạng thái lib
- common-lib ✅ (contract)
- persistence-lib ✅ (entity + repository + constant)
- common-core ⬜ (chưa làm — shared infra/config/security/exception/util)

## File backend đã đổi ở Stage 2
- `pom.xml`: +persistence-lib dependency.
- Xóa: toàn bộ `modules/*/entity`, `modules/*/repository`, `modules/*/constant`, `common/util/convert` (đã chuyển sang persistence-lib).
