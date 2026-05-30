# Báo cáo: media-service (Stage 1 - tách monolith)

## Tổng quan
Microservice ĐỘC LẬP, STATELESS (không DB), lưu trữ file trên S3. Copy logic từ `backend` (S3Service/S3ServiceImpl/S3Config/FileController), dùng `common-lib` cho các DTO/enum/exception dùng chung.

## Cấu trúc file đã tạo
```
media-service/
├── pom.xml                       (parent spring-boot 3.5.6, java 21, deps: web, validation, lombok, awssdk s3 2.20.0, common-lib)
├── mvnw, mvnw.cmd, .mvn/         (copy maven wrapper từ backend)
└── src/main/
    ├── java/iuh/fit/edu/media/
    │   ├── MediaServiceApplication.java        (@SpringBootApplication)
    │   ├── config/S3Config.java                (bean S3Presigner + S3Client; @Value aws.access-key/secret-key/region)
    │   ├── service/S3Service.java              (interface 11 method, giữ import common-lib)
    │   ├── service/impl/S3ServiceImpl.java     (copy nguyên logic, đổi package + import S3Service)
    │   └── web/
    │       ├── MediaInternalController.java    (@RequestMapping /internal/media, 12 endpoint)
    │       └── MediaExceptionHandler.java      (@RestControllerAdvice: 503 / 502)
    └── resources/application.properties        (port 8081, biến aws.* + app.cdn-domain qua env)
```

## Danh sách 12 endpoint REST (base: /internal/media)
| Method + path | Tham số | Trả về |
|---|---|---|
| POST `/presigned/bulk` | @RequestBody BulkPresignedRequest req | List<PresignedUrlResponse> |
| POST `/presigned` | @RequestParam UploadModule module, String targetId, type, originalFilename, contentType | PresignedUrlResponse |
| POST `/upload-url` | @RequestParam String type, extension | Map<String,String> |
| POST `/update-upload-url` | @RequestParam String type, id, extension | Map<String,String> |
| POST `/move` | @RequestParam String type, id, url | String |
| POST `/copy` | @RequestParam UploadModule module, String sourceKey, destinationKey | String |
| POST `/relocate-post` | @RequestParam String sourceKey, postId, mediaType | String |
| POST `/relocate-story` | @RequestParam String sourceKey, storyId, mediaType | String |
| DELETE `` (root) | @RequestParam UploadModule module, String key | ResponseEntity<Void> 204 |
| GET `/content-type` | @RequestParam String extension | String |
| GET `/media-type` | @RequestParam String extension | String |
| GET `/download` | @RequestParam String url | ResponseEntity<byte[]> |

## Kết quả compile
Lệnh: `.\mvnw.cmd -q -o test-compile` (offline) → exit code 0, BUILD SUCCESS.

## Lưu ý
- KHÔNG sửa gì trong `backend` hay `common-lib`.
- Giữ NGUYÊN logic S3; chỉ đổi package (`iuh.fit.edu.media.*`) và import nội bộ S3Service. Các import `iuh.fit.edu.backend.common.*` lấy từ common-lib (đã có trong .m2).
- UploadModule là enum → Spring tự convert @RequestParam string.
- Controller trả raw String cho move/copy/relocate/content-type/media-type (hợp lệ với Spring MVC).
- Endpoint download copy nguyên logic từ FileController (normalizeS3ObjectKey có URLDecoder + xử lý cdnDomain, resolveContentType fallback).
- application.properties dùng env var có giá trị mặc định rỗng cho credential/bucket; service vẫn STATELESS, port 8081.
