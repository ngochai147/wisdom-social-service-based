# Chạy service-base trong 1 container

1 image build & chạy cả **5 service** trong **1 container** tên `wisdom-social-backend`.
Vì chung container nên các service gọi REST nội bộ qua `localhost:<port>` (đúng default).
Compose **chỉ có app**; MariaDB/MongoDB/Redis bạn tự chạy trên host (app nối qua `host.docker.internal`).

| Service | Port |
|---|---|
| media-service | 8081 |
| user-chat-service | 8082 |
| content-service | 8083 |
| notification-service | 8084 |
| ai-service | 8085 |

## 1. Chuẩn bị env
```powershell
Copy-Item service-base/.env.example service-base/.env
# rồi điền giá trị thật trong service-base/.env
```
**Bắt buộc**: MariaDB (3306) + MongoDB (27017) + Redis (6379) phải đang chạy trên **host** (vì compose không kèm chúng). Compose mặc định trỏ tới `host.docker.internal` (Docker Desktop tự map về máy host). Database `wisdom_social` nên tồn tại (JPA `ddl-auto=update` sẽ tạo bảng).

## 2. Build & Run (docker compose)
Chạy từ thư mục `service-base`:
```powershell
cd service-base
docker compose up --build
```
- Build 3 lib + 5 service rồi chạy **1 container** `wisdom-social-backend`.
- Chạy nền: `docker compose up --build -d`.
- Xem log: `docker compose logs -f` (mỗi dòng có prefix `[service-name]`).

## 3. Dừng / xoá
```powershell
docker compose down
```
Build lại sạch: `docker compose build --no-cache`.

## Lưu ý
- **RAM**: 5 JVM (`-Xmx384m`/cái, set trong compose) → cấp Docker ≥ **4GB** (Docker Desktop > Settings > Resources, hoặc WSL2: `%UserProfile%\.wslconfig` đặt `[wsl2]` `memory=6GB`).
- **Khởi chạy tuần tự (stagger)**: `start-all.sh` khởi từng service, chờ port sẵn sàng rồi mới chạy cái kế (tránh 5 JVM boot cùng lúc gây OOM/exit 137). Vì vậy stack cần ~3-4 phút để cả 5 service lên đủ.
- **Fail-fast**: nếu 1 service thoát (vd thiếu env DB), container dừng — xem log để biết service nào.
- **Profile**: mặc định `SPRING_PROFILES_ACTIVE=dev` (nạp `application-dev.properties`). Đổi bằng `-e SPRING_PROFILES_ACTIVE=...`.
- **REST nội bộ**: content→notification (`localhost:8084/internal/notifications`) và content/user-chat→media (`localhost:8081`) chạy trong cùng container nên không cần cấu hình thêm. Riêng `/internal/blocks` ở user-chat-service **chưa hiện thực** (content stub sẽ log warn, không sập).
- Đây là kiểu "mọi service 1 container" theo yêu cầu; production thật nên tách mỗi service 1 container + 1 orchestrator.
