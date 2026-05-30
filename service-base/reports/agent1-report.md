# Bao cao Agent 1 - Media Boundary Owner

## Da lam

- Tao interface boundary `MediaStoragePort` trong `modules/media/application`. Vi signature that cua `S3Service` khac voi goi y trong Agent1.md, port duoc thiet ke khop voi contract that ma `FileController` va cac module business (post/story/chat/user/page) dang dung, de adapter chi viec delegate va Agent 2 co the chuyen cac module business sang goi qua port ma khong doi logic.
- Tao adapter `S3MediaStorageAdapter` (`@Service`, `@RequiredArgsConstructor`) implement `MediaStoragePort`, inject `S3Service`, delegate tung method. Bao cac loi tu AWS/S3/network va wrap thanh `MediaUnavailableException` (tam thoi khong kha dung) hoac `MediaStorageException` (loi storage chung). Loi validation `IllegalArgumentException` duoc giu nguyen de khong doi hanh vi/status code hien co.
- Tao 2 exception `MediaStorageException` va `MediaUnavailableException` (extends `RuntimeException`, 2 constructor message va message+cause). Thong diep khong leak bucket/credential/stack trace; nguyen nhan goc giu trong cause de log noi bo.
- Cap nhat `GlobalExceptionHandler`: them handler `MediaUnavailableException` -> HTTP 503, `MediaStorageException` -> HTTP 502, dung dung format `ApiResponse` (qua `buildErrorResponse`) giong cac handler khac. Khong sua handler cu.
- Refactor `FileController`: bo inject `S3Service`, doi sang inject `MediaStoragePort`; endpoint `POST /api/files/presigned-url` goi `mediaStoragePort.generateBulkPresignedUploadUrls(request)` thay cho `s3Service.generateMultiplePresignedUrls(request)`. Endpoint, DTO, validation, security giu nguyen.

## MediaStoragePort signature cuoi cung

```java
public interface MediaStoragePort {
    List<PresignedUrlResponse> generateBulkPresignedUploadUrls(BulkPresignedRequest request);
    PresignedUrlResponse generatePresignedUploadUrl(UploadModule module, String targetId, String type, String originalFilename, String contentType);
    Map<String, String> generateUploadUrl(String type, String extension);
    Map<String, String> generateUpdateUploadUrl(String type, String id, String extension);
    String moveUploadUrl(String type, String id, String url);
    String copyObject(UploadModule module, String sourceKey, String destinationKey);
    String relocatePostMediaKey(String sourceKey, String postId, String mediaType);
    String relocateStoryMediaKey(String sourceKey, String storyId, String mediaType);
    void deleteMedia(UploadModule module, String objectKey);
    String getContentType(String extension);
    String resolveMediaType(String extension);
}
```

Ghi chu mapping sang `S3Service`:
- `generateBulkPresignedUploadUrls` -> `generateMultiplePresignedUrls`
- `generatePresignedUploadUrl` -> `generatePresignedUrl`
- `deleteMedia` -> `deleteByKey`
- Cac method con lai dat ten/giu signature giong `S3Service` de delegate truc tiep.

## File da tao

- `backend/src/main/java/iuh/fit/edu/backend/modules/media/application/MediaStoragePort.java`
- `backend/src/main/java/iuh/fit/edu/backend/modules/media/infrastructure/S3MediaStorageAdapter.java`
- `backend/src/main/java/iuh/fit/edu/backend/common/exception/MediaStorageException.java`
- `backend/src/main/java/iuh/fit/edu/backend/common/exception/MediaUnavailableException.java`

## File da sua

- `backend/src/main/java/iuh/fit/edu/backend/common/exception/GlobalExceptionHandler.java` (them 2 handler media)
- `backend/src/main/java/iuh/fit/edu/backend/modules/media/controller/FileController.java` (inject `MediaStoragePort` thay `S3Service`)

## Kiem tra

- Compile: `mvnw.cmd -o test-compile` => **BUILD SUCCESS** (offline, khong can bo `-o`). Toan bo project compile duoc, ke ca cac module business van con goi `S3Service` truc tiep, vi `S3Service`/`S3ServiceImpl` khong bi dong cham.
- `rg "S3Service" trong modules/media`: chi con xuat hien trong `S3MediaStorageAdapter` (import + field + javadoc) va trong javadoc cua `MediaStoragePort`. `FileController` khong con inject `S3Service`. Dung voi ket qua chap nhan o Buoc 7.
- `rg "common.service.s3" trong modules/media`: chi con o `S3MediaStorageAdapter` (adapter duoc phep).

## Luu y / rui ro

- Endpoint `GET /api/files/download` trong `FileController` dung `S3Client` truc tiep (tai object), KHONG dung `S3Service`. Day la bean S3 cap thap khac, nam ngoai contract cua `S3Service`/`MediaStoragePort`, nen giu nguyen de khong doi hanh vi. Neu muon dua xuong qua port hoan toan thi can mo rong port them method tai object (resolve/stream) - de xuat cho lan sau, khong lam trong scope nay.
- `S3ServiceImpl.deleteByKey` hien dang "nuot" loi xoa (chi log). Vi vay `deleteMedia` qua port se hau nhu khong nem ra `MediaUnavailableException`/`MediaStorageException` cho truong hop xoa - dung theo hanh vi hien co, khong sua de tranh doi logic thu hoi (recovery) cua post/chat.
- `S3ServiceImpl.generatePresignedUrl` dang tu wrap loi thanh `RuntimeException("Khong the khoi tao phien tai len")` truoc khi den adapter. Truong hop nay adapter se bat o nhanh `RuntimeException` chung va wrap thanh `MediaStorageException`. Toi khong sua `S3ServiceImpl` (ngoai scope), nhung ghi chu de Agent 2 / lan sau co the cho `S3ServiceImpl` nem exception goc de phan loai 503/502 chinh xac hon.
- Cac module business (post/story/chat/user/page) VAN goi `S3Service` truc tiep - dung theo phan cong, day la viec cua Agent 2. Day khong phai loi compile.
- Adapter map loi: `SdkClientException` va `AwsServiceException` (5xx hoac statusCode 0) -> 503 `MediaUnavailableException`; `AwsServiceException` 4xx khac va `RuntimeException` chung -> 502 `MediaStorageException`. `IllegalArgumentException` giu nguyen de validation hien co hoat dong nhu cu.
