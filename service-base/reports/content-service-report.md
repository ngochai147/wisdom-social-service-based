# Báo cáo: content-service

Microservice Spring Boot độc lập tại `c:\Users\PC\Desktop\test\service-base\content-service`.
Mục tiêu **test-compile BUILD SUCCESS (offline)** đã đạt — **exit code 0**.

## 1. Tổng quan

- Parent `spring-boot-starter-parent:3.5.6`, Java 21, groupId `iuh.fit.edu`, artifactId `content-service`.
- Dùng chung DB + lib nền trong `.m2`: `common-lib`, `persistence-lib`, `common-core` (0.0.1-SNAPSHOT).
- Tổng **96 file .java** nguồn → **133 .class** sau biên dịch.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/` copy từ backend.
- `pom.xml`: 3 lib nền + `mapstruct:1.6.3` + `mariadb-java-client` (runtime) + lombok (optional) + spring-boot-starter-test (test). Build có `annotationProcessorPaths` (lombok 1.18.36, mapstruct-processor 1.6.3, lombok-mapstruct-binding 0.2.0) và spring-boot-maven-plugin (exclude lombok).

## 2. Module đã copy nguyên (giữ package `iuh.fit.edu.backend.modules.<m>`)

| Module | Số file .java |
|--------|---------------|
| post   | 37 |
| page   | 36 |
| story  | 7  |
| note   | 2  |
| music  | 3  |

Tổng 85 file module + 11 file hạ tầng/shim/app.

## 3. App + resources

- `ContentServiceApplication.java` (package `iuh.fit.edu.backend`): `@SpringBootApplication(exclude=RedisRepositoriesAutoConfiguration.class)`, `@EnableJpaRepositories`/`@EnableMongoRepositories` (basePackages `iuh.fit.edu.backend.modules`, includeFilters theo Jpa/MongoRepository), `@EnableScheduling`.
- `application.properties`: `spring.application.name=content-service`, `server.port=8083`, `media.service.base-url`, `user.service.base-url`, `notification.service.base-url` (đều có default + override qua ENV), driver mariadb.
- `application-dev.properties`: copy từ backend, giữ placeholder DB/mongo/redis/aws/cognito/jwt.

## 4. Cross-service shims đã tạo

Đã grep `userService.` / `friendService.` / `blockUserService.` / `notificationService.` trong post/page/story/note/music — usage thực tế khớp đúng spec, **không cần thêm method nào ngoài danh sách**.

### 4a. LOCAL (đọc DB chung qua repository, KHÔNG REST)

| Shim | Method | Logic |
|------|--------|-------|
| `user/service/UserService.java` (interface) | `User getCurrentUser()`, `User findUserById(long id)` | narrow interface |
| `user/service/impl/LocalUserServiceImpl.java` (`@Service`) | `getCurrentUser()` | delegate `CurrentUserService.getCurrentUser()` (common-core) |
| | `findUserById(long)` | `userRepository.findById(id).orElse(null)` — đúng logic gốc |
| `user/service/FriendService.java` (interface) | `List<Long> getAcceptedFriendIds(long userId)` | narrow interface |
| `user/service/impl/LocalFriendServiceImpl.java` (`@Service`) | `getAcceptedFriendIds(long)` | guard `userId<=0` → emptyList; `friendRepository.findAcceptedFriendIds(userId, FriendStatus.ACCEPTED.ordinal())` — đúng logic gốc |

### 4b. REST stub (writes/side-effect, graceful degradation)

| Shim | Method | Hành vi |
|------|--------|---------|
| `notification/event/payload/NotificationEvent.java` | — | COPY NGUYÊN từ backend (cùng FQN, payload) |
| `notification/service/NotificationService.java` (interface) | `void createNotification(NotificationEvent)` | narrow interface |
| `notification/service/impl/RemoteNotificationServiceImpl.java` (`@Service @Slf4j`) | `createNotification` | RestClient POST `${notification.service.base-url:8084}/internal/notifications`; try/catch `ResourceAccessException`/`RestClientException` → log.warn, **KHÔNG ném** (notification optional) |
| `user/service/BlockUserService.java` (interface) | `boolean blockUser(BlockedUser)`, `boolean cancelBlockUser(BlockedUser)` | narrow interface |
| `user/service/impl/RemoteBlockUserServiceImpl.java` (`@Service @Slf4j`) | `blockUser` / `cancelBlockUser` | RestClient POST/DELETE `${user.service.base-url:8082}/internal/blocks`; try/catch → log.warn, **trả `false`** khi lỗi |

### 4c. Media adapter

- `media/infrastructure/RemoteMediaStorageAdapter.java` (`@Service`, implements `MediaStoragePort`): bản đã BỎ `@ConditionalOnProperty`, giữ logic REST sang `${media.service.base-url:8081}/internal/media`. (content dùng MediaStoragePort 5×.)

## 5. Cross-module type

Grep toàn bộ import `iuh.fit.edu.backend.modules.*` trong 5 module: chỉ tham chiếu **media / notification / user** — tất cả đã được phục vụ bởi lib nền (entity/repository/constant trong persistence-lib; MediaStoragePort + DTO trong common-lib) hoặc shim ở trên. **KHÔNG có type cross-module nào khác (ai/chat/conversation...) còn thiếu.**

## 6. Kết quả compile

```
.\mvnw.cmd -q -o test-compile   →   EXIT 0 (BUILD SUCCESS, offline)
```

## 7. LƯU Ý runtime

- **REST stub** (`RemoteBlockUserServiceImpl`, `RemoteNotificationServiceImpl`): hiện ở mức compile-level. Provider endpoint (`/internal/blocks` ở user-service:8082, `/internal/notifications` ở notification-service:8084) **chưa tồn tại** — cần service tương ứng cung cấp. Khi chưa có, block trả `false` (no-op an toàn), notification bị nuốt (không fail nghiệp vụ content).
- **RemoteMediaStorageAdapter**: cần media-service (`:8081/internal/media`) chạy; lỗi mạng/5xx được wrap thành `MediaUnavailableException`/`MediaStorageException`.
- **Component-scan nạp config common-core**: cần đầy đủ ENV (DB MariaDB, MongoDB, Redis, AWS S3/CDN, Cognito, JWT secret) như placeholder trong `application-dev.properties`, nếu không context sẽ fail khi khởi động.
- `LocalUserServiceImpl`/`LocalFriendServiceImpl` đọc trực tiếp DB dùng chung — yêu cầu schema user/friend tồn tại trong cùng DB.
