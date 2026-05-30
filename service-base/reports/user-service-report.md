# Báo cáo tạo microservice `user-service`

Đường dẫn: `c:\Users\PC\Desktop\test\service-base\user-service`
Ngày: 2026-05-29
Kết quả test-compile (offline): **BUILD SUCCESS (exit code 0)** — 59 source files compiled.

## 1. File được tạo mới

- `pom.xml` — parent spring-boot-starter-parent 3.5.6, java 21, groupId `iuh.fit.edu`, artifactId `user-service`.
  - Dependencies: common-lib, persistence-lib, common-core (0.0.1-SNAPSHOT); mapstruct 1.6.3; mariadb-java-client (runtime); lombok (optional); spring-boot-starter-test (test).
  - build: maven-compiler-plugin với annotationProcessorPaths (lombok 1.18.36, mapstruct-processor 1.6.3, lombok-mapstruct-binding 0.2.0); spring-boot-maven-plugin (exclude lombok).
- `src/main/java/iuh/fit/edu/backend/UserServiceApplication.java` — package `iuh.fit.edu.backend`:
  - `@SpringBootApplication(exclude = RedisRepositoriesAutoConfiguration.class)`
  - `@EnableJpaRepositories` / `@EnableMongoRepositories` (basePackages `iuh.fit.edu.backend.modules`, includeFilters theo ASSIGNABLE_TYPE)
  - `@EnableScheduling`
- `src/main/resources/application.properties` — sửa từ bản backend:
  - `spring.application.name=user-service`
  - `server.port=8082`
  - `media.service.base-url=${MEDIA_SERVICE_BASE_URL:http://localhost:8081}`
  - Giữ `spring.datasource.driver-class-name`, `spring.jpa.show-sql`.
- `src/main/resources/application-dev.properties` — copy nguyên (giữ toàn bộ placeholder datasource/mongo/redis/aws/cognito/jwt/ai/web-url).

## 2. File được copy

- Toàn bộ thư mục `modules/user` (57 file .java) — giữ nguyên package `iuh.fit.edu.backend.modules.user`.
- `modules/media/infrastructure/RemoteMediaStorageAdapter.java` (xem mục 4).
- `mvnw`, `mvnw.cmd`, `.mvn/` từ backend.

## 3. Thay đổi ở ChatUserSearchServiceImpl

File: `modules/user/service/impl/ChatUserSearchServiceImpl.java`
- XÓA import `iuh.fit.edu.backend.modules.conversation.service.DirectConversationService`.
- XÓA field `private final DirectConversationService directConversationService;`.
- Thay `directConversationService.buildDirectKey(currentUserId, user.getId())` bằng method nội bộ `buildDirectKey(...)`.
- Thêm method private:
  ```java
  private String buildDirectKey(Long userId1, Long userId2) {
      long first = Math.min(userId1, userId2);
      long second = Math.max(userId1, userId2);
      return first + ":" + second;
  }
  ```
- Constructor dùng `@RequiredArgsConstructor` (lombok) nên chỉ cần xóa field. Đã xác nhận không còn tham chiếu `DirectConversationService` / `DirectConversationResolveResult` nào trong toàn service.

## 4. RemoteMediaStorageAdapter

- Copy sang cùng package `iuh.fit.edu.backend.modules.media.infrastructure`.
- BỎ annotation `@ConditionalOnProperty(name = "media.mode", havingValue = "remote")` và import tương ứng (`org.springframework.boot.autoconfigure.condition.ConditionalOnProperty`).
- Giữ `@Service`, `@Slf4j`, toàn bộ logic RestClient và method `call(...)`. Implements `MediaStoragePort` (common-lib). Dùng property `media.service.base-url`.
- KHÔNG copy S3MediaStorageAdapter.

## 5. Kết quả compile

```
[INFO] Compiling 59 source files ...
[INFO] BUILD SUCCESS
EXITCODE=0
```
Warning (không chặn build, đã có sẵn trong source gốc):
- `UserResponseConfirmRegister.java`: @Builder bỏ qua initializing expression.
- `UserMapper.java`: MapStruct unmapped target properties (mapping có chủ đích).

Không có type cross-module nào còn thiếu. Các tham chiếu cross-module còn lại (post/story/conversation/chat repository + constant, MediaStoragePort) đều được giải quyết bởi persistence-lib và common-lib trong .m2.

## 6. Lưu ý runtime (chưa test runtime)

Component-scan mặc định ở package `iuh.fit.edu.backend` sẽ nạp `common.*` của common-core (nhiều `@Configuration`: security, JWT, AWS S3/Cognito, Mongo, Redis, websocket, dotenv). Khi chạy thật cần cung cấp đầy đủ biến môi trường:
- DB: `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`
- Mongo: `SPRING_DATA_MONGODB_URI`
- Redis: `SPRING_DATA_REDIS_HOST/PORT/PASSWORD`
- AWS/S3: `AWS_REGION/ACCESS_KEY/SECRET_KEY/S3_BUCKET_NAME`, `APP_CDN_DOMAIN`
- Cognito: `AWS_COGNITO_USER_POOL_ID/CLIENT_ID`
- JWT: `JWT_SECRET_KEY`
- AI (nếu common-core khởi tạo): `AI_PROVIDER_BASE_URL/API_KEY`
- Media remote: `MEDIA_SERVICE_BASE_URL` (mặc định http://localhost:8081)

RedisRepositoriesAutoConfiguration đã được exclude (giống backend).
