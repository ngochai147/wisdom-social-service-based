# PLAN — Tách backend thành nhiều service (service-based, chung DB)

## Quyết định kiến trúc (đã chốt với user)

- Mỗi service = **project Maven độc lập** (own pom + src + chạy riêng port), nằm trong `service-base/`.
- **Tất cả chung DB** (MariaDB + MongoDB + Redis hiện có) — không tách DB, không migrate dữ liệu.
- Giao tiếp cross-service qua **REST**.
- Vì coupling chéo (vòng tròn) nên **gom theo cụm coupling** thay vì 1 module = 1 service.
- Stack giữ nguyên: Spring Boot 3.5.6, Java 21, Lombok, MapStruct.

## Lý do gom cụm (đo coupling thực tế)

Import chéo phần lớn là **entity/repository/constant/event-payload** (chia sẻ được qua `common-lib`),
chỉ số ít là **service business call** (cần REST). `chat`↔`conversation` và `post`↔`notification`
dính rất chặt nên để chung cụm. `user` là core được mọi cụm tham chiếu (entity `User`, `UserRepository`).

## Danh sách service mục tiêu

| Service | Modules | Ghi chú |
|---|---|---|
| `common-lib` | (library) | Shared kernel: DTO contract, constant, exception, + entity/repository dùng chung. KHÔNG phải app. |
| `media-service` | media (S3 storage) | **Stateless** (chỉ S3, không DB). Tách sạch nhất → làm Stage 1. |
| `user-service` | user | Core domain. Cung cấp REST cho các cụm khác. |
| `chat-service` | chat + conversation | Dính chặt 2 chiều → 1 cụm. |
| `content-service` | post + page + story + note + music | post↔notification, nhiều media. |
| `notification-service` | notification | post→notification 17 → cần REST endpoint nhận event. |
| `ai-service` | ai | Nhỏ, phụ thuộc user+chat. |

> `Media`/`MediaMetadata` trong `modules/media/entity` thực ra là **value object của post**
> (phụ thuộc `post.entity.Location`), KHÔNG thuộc media-service. Chúng ở lại content-service.
> media-service chỉ là **file/S3 service**: S3Config + S3Service + FileController + DTO contract.

## Thứ tự thực thi (strangler-fig)

`backend` đóng vai monolith co dần. Mỗi stage peel 1 cụm ra, backend gọi cụm đó qua REST.

- **Stage 1 — media-service** (đang làm):
  - 1a: `common-lib` (UploadModule, PresignedUrlResponse, BulkPresignedRequest, MediaStorageException, MediaUnavailableException) — giữ package `iuh.fit.edu.backend.common.*` để backend không phải đổi import. Install vào `.m2`.
  - 1b: `media-service` — Spring Boot độc lập, REST API mirror `MediaStoragePort` + download, depends common-lib.
  - 1c: backend depends common-lib (xóa bản copy 5 class), thêm `RemoteMediaStorageAdapter` (RestClient → media-service). Giữ `S3MediaStorageAdapter` làm fallback, chọn bằng property `media.mode=local|remote`.
- **Stage 2 — user-service**: chuyển `User` entity/repo + cross-cutting vào common-lib; user-service expose REST (getUser, friend status...). backend cụm khác gọi qua REST.
- **Stage 3 — chat-service** (chat+conversation).
- **Stage 4 — content-service** (post+page+story+note+music).
- **Stage 5 — notification-service**.
- **Stage 6 — ai-service**.

Mỗi stage: verify `test-compile` của service mới + backend trước khi sang stage kế.

## Lưu ý / rủi ro

- Không runtime-test được trong môi trường này (cần MariaDB/Mongo/Redis/AWS creds) → chỉ verify tới compile.
- Cross-service REST làm tăng latency + cần xử lý lỗi mạng (đã có Media exceptions làm mẫu).
- Shared entity trong common-lib = coupling ở tầng DB schema (chấp nhận vì "chung DB").
- Security/JWT hiện ở `common/config` của backend; mỗi service cần cấu hình auth riêng hoặc tin tưởng mạng nội bộ — quyết định ở Stage 2.

## Trạng thái

- [x] Stage 1a — common-lib (build + install .m2: BUILD SUCCESS)
- [x] Stage 1b — media-service (test-compile: BUILD SUCCESS, 12 REST endpoint /internal/media)
- [x] Stage 1c — backend wire REST (test-compile: BUILD SUCCESS; common-lib dep + xóa 5 class trùng + RemoteMediaStorageAdapter)
- [x] **Stage 2 — persistence-lib + common-core + user-service** (tất cả test-compile BUILD SUCCESS). Xem `reports/stage2-report.md`.
- [ ] Stage 3-6 — chat+conversation / content / notification / ai

### 3 lib nền (shared, chung DB) — XONG
- `common-lib` ✅ — contract (DTO/constant/media-exception + MediaStoragePort)
- `persistence-lib` ✅ — 109 file: entity + repository + constant + converter
- `common-core` ✅ — 45 file: shared infra (config/security/exception/util/event/ApiResponse + AIErrorResponse)

### Services — TẤT CẢ compile BUILD SUCCESS ✅
| Service | Port | Modules | Cross-service |
|---|---|---|---|
| `media-service` | 8081 | media (S3) | — (stateless) |
| `user-chat-service` | 8082 | user + chat + conversation | media (REST) |
| `content-service` | 8083 | post+page+story+note+music | media (REST), user (local shim), block+notification (REST stub) |
| `notification-service` | 8084 | notification | user (local shim); expose `/internal/notifications` |
| `ai-service` | 8085 | ai (+webflux) | user (local shim) |

> Grouping cuối: **5 service** (chat gộp user vì coupling 2 chiều). Cross-service user-read giải bằng
> `CurrentUserService` (common-core) + repository cục bộ; business call (block/notification) qua REST.

### Pattern đã dùng (tổng kết)
- **Data**: mọi service chung `persistence-lib` (entity/repo/constant) trên 1 DB.
- **Infra**: chung `common-core` (config/security/exception/util + `CurrentUserService`).
- **Contract**: chung `common-lib` (DTO/constant/MediaStoragePort).
- **getCurrentUser**: resolve cục bộ qua `CurrentUserService` (không REST).
- **Business cross-service**: narrow interface (consumer-driven) + REST stub graceful (media/notification/block).

### Lưu ý migration (strangler)
- `modules/user` hiện CÓ Ở CẢ backend lẫn user-service (duplicate có chủ đích): backend vẫn phục vụ user + các module khác gọi UserService in-process. Khi cắt sang user-service thật thì mới gỡ khỏi backend.
- user-service component-scan `iuh.fit.edu.backend` → nạp nhiều @Configuration của common-core (DB/Mongo/Redis/S3/Cognito/JWT) → cần đủ env khi chạy. Chưa runtime-test.

### Mẫu lặp lại cho Stage 3-6 (mỗi cụm)
1. Outbound coupling phần lớn đã được persistence-lib + common-lib + common-core giải.
2. Cross-service business call còn lại → REST stub/adapter (mẫu: RemoteMediaStorageAdapter).
3. Copy module code vào service mới, app + properties riêng (port kế tiếp), compile.

### Cách chạy media remote (Stage 1c)
- Mặc định `media.mode=local` → backend dùng `S3MediaStorageAdapter` như cũ (không đổi hành vi).
- Đặt `media.mode=remote` + `media.service.base-url=http://<host>:8081` → backend route mọi media call qua `RemoteMediaStorageAdapter` → media-service.
- media-service chạy port 8081, cần env `AWS_ACCESS_KEY/AWS_SECRET_KEY/AWS_REGION/AWS_S3_BUCKET_NAME/APP_CDN_DOMAIN`.

### Còn lại của Stage 1 (chưa làm, ghi rõ)
- Chưa runtime-test (cần AWS creds + media-service chạy thật).
- `FileController.download` trong backend vẫn dùng `S3Client` trực tiếp (chưa proxy sang media-service); ở remote mode vẫn cần S3 cho riêng path download. Có thể proxy ở bước sau.
- Chưa gỡ hẳn S3Service/S3Config khỏi backend (giữ cho local mode + download).
