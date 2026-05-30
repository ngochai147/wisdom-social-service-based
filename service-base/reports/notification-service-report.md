# Báo cáo: notification-service

## Tổng quan
Tạo microservice Spring Boot ĐỘC LẬP `notification-service` tại
`c:\Users\PC\Desktop\test\service-base\notification-service` (artifactId `notification-service`,
groupId `iuh.fit.edu`, port 8084). Build offline `test-compile` **BUILD SUCCESS (exit 0)**.

Nguồn copy: backend `c:\Users\PC\Desktop\test\backend`.
Tham chiếu pattern: `content-service` (đã có sẵn trong service-base, dùng cùng shim user).

## Danh sách file

### Cấu hình / wrapper
- `pom.xml` — parent spring-boot 3.5.6, java 21. Deps: persistence-lib, common-core,
  common-lib, mapstruct 1.6.3, mariadb-java-client (runtime), lombok (optional),
  spring-boot-starter-test (test). maven-compiler-plugin annotationProcessorPaths
  (lombok 1.18.36, mapstruct-processor 1.6.3, lombok-mapstruct-binding 0.2.0);
  spring-boot-maven-plugin exclude lombok.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` — copy từ backend.

### Module notification (copy nguyên, giữ package `iuh.fit.edu.backend.modules.notification.*`)
- `modules/notification/controller/NotificationController.java`
- `modules/notification/service/NotificationService.java`
- `modules/notification/service/impl/NotificationServiceImpl.java`
- `modules/notification/event/payload/NotificationEvent.java`
- `modules/notification/event/handler/NotificationEventHandler.java`
- `modules/notification/event/publisher/NotificationEventPublisher.java`

### Shim user (LOCAL, đọc DB chung — KHÔNG REST)
- `modules/user/service/UserService.java` — interface: `User getCurrentUser(); User findUserById(long id);`
- `modules/user/service/impl/LocalUserServiceImpl.java` — `@Service`, inject
  `common.service.security.CurrentUserService` (common-core) + `modules.user.repository.UserRepository`
  (persistence-lib).
  - `getCurrentUser()` → `currentUserService.getCurrentUser()`.
  - `findUserById(long id)` → `userRepository.findById(id).orElse(null)` (khớp đúng logic gốc
    `backend/.../user/service/impl/UserServiceImpl.java#findUserById`, dòng 510-512).

### Endpoint provider
- `modules/notification/controller/InternalNotificationController.java` —
  `@RestController @RequestMapping("/internal/notifications")`, `@PostMapping` nhận
  `@RequestBody NotificationEvent` → `notificationService.createNotification(event)` →
  `ResponseEntity<Void>` **202 Accepted**. Inject `NotificationService`.
  - Đây là provider cho content-service: `RemoteNotificationServiceImpl` của content-service POST
    tới `http://localhost:8084/internal/notifications` (xác nhận khớp URL + port).

### Application + resources
- `NotificationServiceApplication.java` (package `iuh.fit.edu.backend`):
  `@SpringBootApplication(exclude=RedisRepositoriesAutoConfiguration.class)`,
  `@EnableJpaRepositories` (basePackages `iuh.fit.edu.backend.modules`, includeFilter JpaRepository),
  `@EnableMongoRepositories` (includeFilter MongoRepository), `@EnableScheduling`.
- `src/main/resources/application.properties` — `spring.application.name=notification-service`,
  `server.port=8084`, mariadb driver.
- `src/main/resources/application-dev.properties` — copy từ backend, giữ nguyên toàn bộ placeholder
  DB/mongo/redis/aws/cognito/jwt.

## Shim đã tạo
1 shim user gồm 2 file (interface + impl). Chỉ expose 2 method mà module notification thực sự gọi:
- `getCurrentUser()` — gọi 5 lần trong `NotificationController`.
- `findUserById(long)` — gọi 2 lần trong `NotificationEventPublisher`.
KHÔNG cần shim nào khác.

## Endpoint
- `POST /internal/notifications` — nhận `NotificationEvent`, trả 202 Accepted.

## Kết quả compile
```
.\mvnw.cmd -q -o test-compile  →  exit 0 (BUILD SUCCESS, offline)
```
10 file Java compile thành công. Không có lỗi cross-module ngoài user.

## Lưu ý runtime
- Service dùng chung 1 DB (MariaDB) + MongoDB + Redis với backend — đọc/ghi trực tiếp, KHÔNG REST
  sang user-service (chỉ shim local).
- `NotificationServiceImpl` và `NotificationEventPublisher` cần bean `pubSubRedisTemplate`
  (`@Qualifier`) và `pubSubObjectMapper` — được cung cấp bởi `common.config.RedisPubSubConfig`
  (common-core). Cần Redis chạy khi runtime.
- `NotificationEventHandler` implements `common.event.handler.RedisEventHandler` và cần
  `SimpMessagingTemplate` (WebSocket). Đảm bảo cấu hình WebSocket/Redis pub-sub của common-core
  được active khi chạy thật.
- Cần file `.env` (hoặc biến môi trường) cung cấp các placeholder trong `application-dev.properties`
  (SPRING_DATASOURCE_*, SPRING_DATA_MONGODB_URI, JWT_SECRET_KEY, AWS_*, AWS_COGNITO_*, ...).
- `RedisRepositoriesAutoConfiguration` đã bị exclude để tránh xung đột (notification dùng Redis
  thuần pub/sub + cache, không dùng Redis repositories).
