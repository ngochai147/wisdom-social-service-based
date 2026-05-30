# Báo cáo: ai-service

Microservice Spring Boot ĐỘC LẬP `ai-service` tại `c:\Users\PC\Desktop\test\service-base\ai-service`.

## Kết quả tổng quan
- Compile offline: `.\mvnw.cmd -q -o test-compile` -> **BUILD SUCCESS, exit code 0**.
- Tổng số file Java tạo/copy: **18** (15 file module ai + 1 main app + 2 file shim user).
- Có thêm `spring-boot-starter-webflux`: **CÓ** (bắt buộc).
- Không phát hiện cross-module thiếu ngoài user/chat.

## Bước 1 - pom + wrapper
- Parent `spring-boot-starter-parent:3.5.6`, java 21, groupId `iuh.fit.edu`, artifactId `ai-service`.
- Dependencies: `persistence-lib`, `common-core`, `common-lib` (0.0.1-SNAPSHOT); `org.mapstruct:mapstruct:1.6.3`; `org.mariadb.jdbc:mariadb-java-client` (runtime); lombok (optional); `spring-boot-starter-test` (test).
- **spring-boot-starter-webflux ĐÃ THÊM**: lý do là `OpenRouterAIProviderService` gọi AI provider bằng
  `org.springframework.web.reactive.function.client.WebClient` / `WebClientResponseException` và dùng reactive
  (`.bodyToMono(...).block()`). Web MVC (qua common-core) không cung cấp WebClient reactive nên cần webflux.
- build: `maven-compiler-plugin` với annotationProcessorPaths (lombok 1.18.36, mapstruct-processor 1.6.3,
  lombok-mapstruct-binding 0.2.0); `spring-boot-maven-plugin` (exclude lombok).
- Copy `mvnw`, `mvnw.cmd`, `.mvn/` từ backend.

## Bước 2 - Copy module ai
- Copy `backend/.../modules/ai` -> `ai-service/.../modules/ai` (giữ nguyên package), 15 file.
- `AIErrorResponse`: KHÔNG tồn tại trong module ai của backend (đã move sang common-core, đã có sẵn ở
  `iuh/fit/edu/backend/modules/ai/dto/response/AIErrorResponse.class` trong common-core jar). Không có gì để xóa,
  không trùng class.

## Bước 3 - Shim user (LOCAL, không REST)
ai chỉ gọi `userService.getCurrentUser()` (trong `UserAIConsentServiceImpl`). Đã tạo:
- `modules/user/service/UserService.java` - interface: `User getCurrentUser();`
- `modules/user/service/impl/LocalUserServiceImpl.java` - `@Service`, inject
  `iuh.fit.edu.backend.common.service.security.CurrentUserService`, `getCurrentUser()` ->
  `currentUserService.getCurrentUser()`.

Lưu ý: `UserRepository` và `User` entity nằm sẵn trong **persistence-lib** (.m2), nên `UserAIConsentServiceImpl`
inject `UserRepository` từ lib, không cần shim repository. Không có method UserService nào khác bị thiếu.

## Bước 4 - App + resources
- `AiServiceApplication.java` (package `iuh.fit.edu.backend`):
  `@SpringBootApplication(exclude = RedisRepositoriesAutoConfiguration.class)`,
  `@EnableJpaRepositories(basePackages="iuh.fit.edu.backend.modules", includeFilters JpaRepository)`,
  `@EnableMongoRepositories(... MongoRepository)`, `@EnableScheduling`.
- `application.properties`: `spring.application.name=ai-service`, `server.port=8085`,
  driver mariadb, `spring.jpa.show-sql=false`.
- `application-dev.properties`: giữ nguyên placeholder DB/mongo/redis/aws/cognito/jwt + `ai.provider.base-url` /
  `ai.provider.api-key` (AIProperties từ common-core cần 2 key này).

## Bước 5 - Verify
```
Set-Location c:\Users\PC\Desktop\test\service-base\ai-service
.\mvnw.cmd -q -o test-compile   # exit 0, 23 class sinh ra trong target/classes
```

## Lưu ý runtime
- `AIProperties` (common-core, prefix `ai.provider`) cần `ai.provider.base-url` và `ai.provider.api-key`; nếu thiếu
  thì gọi AI provider sẽ ném `ExternalAIServiceException` (kiểm tra trong code), không lỗi khởi động compile-time.
- Cần biến môi trường thực (.env) cho DB/mongo/redis/aws/cognito/jwt khi chạy thật (profile dev import optional .env).
- Redis repositories auto-config đã bị exclude (giống backend), nhưng redis client/template vẫn nạp qua common-core.
- Service dùng chung DB với backend (persistence-lib): các bảng user/chat phải tồn tại sẵn.
- Bảo mật/security context: `CurrentUserService.getCurrentUser()` đọc từ SecurityContext + UserRepository, nên các
  endpoint AI cần JWT/cognito filter (kéo từ common-core) hoạt động đúng lúc runtime.
