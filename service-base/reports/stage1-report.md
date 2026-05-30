# Báo cáo Stage 1 — Tách media-service

## Đã làm

1. **common-lib** (`service-base/common-lib`) — shared contract jar, package `iuh.fit.edu.backend.common.*`:
   - `constant/UploadModule`, `dto/response/PresignedUrlResponse`, `dto/response/BulkPresignedRequest`,
     `exception/MediaStorageException`, `exception/MediaUnavailableException`.
   - Build + install vào local `.m2`: **BUILD SUCCESS**.

2. **media-service** (`service-base/media-service`) — Spring Boot 3.5.6 độc lập, stateless (không DB), port 8081:
   - `config/S3Config`, `service/S3Service` + `service/impl/S3ServiceImpl` (copy logic từ backend, đổi package, giữ import common-lib).
   - `web/MediaInternalController` — 12 endpoint REST dưới `/internal/media` (mirror MediaStoragePort + download).
   - `web/MediaExceptionHandler` — MediaUnavailableException→503, MediaStorageException→502.
   - `test-compile` (offline): **BUILD SUCCESS**.

3. **backend** (wire qua REST, không phá local mode):
   - Thêm dependency `iuh.fit.edu:common-lib:0.0.1-SNAPSHOT`.
   - **Xóa 5 class trùng** (đã chuyển sang common-lib, cùng FQN → không class nào phải đổi import).
   - `S3MediaStorageAdapter`: gate `@ConditionalOnProperty(media.mode=local, matchIfMissing=true)` → mặc định vẫn local.
   - Thêm `RemoteMediaStorageAdapter` (RestClient → media-service), gate `media.mode=remote`. Map lỗi mạng/503→MediaUnavailableException, lỗi khác→MediaStorageException.
   - `test-compile` (offline): **BUILD SUCCESS**.

## Kiến trúc đạt được

- backend gọi media qua `MediaStoragePort` (boundary từ lần refactor trước). Đổi `media.mode` để chọn local (S3 trực tiếp) hay remote (qua media-service) — **không sửa business module**.
- common-lib là contract dùng chung giữa backend (caller) và media-service (provider).

## Kiểm tra
- common-lib install: BUILD SUCCESS
- media-service `mvnw.cmd -o test-compile`: BUILD SUCCESS (exit 0)
- backend `mvnw.cmd -o test-compile`: BUILD SUCCESS (exit 0)

## Lưu ý / rủi ro / còn lại
- Chưa runtime-test (cần MariaDB/Mongo/Redis cho backend, AWS creds cho media-service).
- `FileController.download` ở backend vẫn dùng `S3Client` trực tiếp — chưa proxy sang media-service.
- Chưa gỡ hẳn S3 khỏi backend (giữ cho local mode + download).
- Các service còn lại (user, chat+conversation, content, notification, ai) chưa tách — xem PLAN.md Stage 2-6.
