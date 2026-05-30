# Bao cao Agent 2 - Business Caller Refactor

## Da lam

- Refactor toan bo 8 file business con goi truc tiep `S3Service` sang dung `MediaStoragePort` (cong/port do Agent 1 tao).
- Doi field `S3Service s3Service` -> `MediaStoragePort mediaStoragePort`, sua import, sua constructor (cho cac class dung constructor thu cong), va sua moi method call theo bang mapping.
- Ap dung bang mapping ten method: `generatePresignedUrl` -> `generatePresignedUploadUrl`, `deleteByKey` -> `deleteMedia`, `generateMultiplePresignedUrls` -> `generateBulkPresignedUploadUrls` (khong xuat hien trong 8 file nay). Cac ten khac giu nguyen (`moveUploadUrl`, `generateUploadUrl`, `generateUpdateUploadUrl`, `copyObject`, `relocatePostMediaKey`, `relocateStoryMediaKey`, `getContentType`, `resolveMediaType`).
- Khong import `common.service.s3.S3Service` hay `modules.media.infrastructure.*` trong bat ky business module nao.
- Khong sua `S3Service`, `S3ServiceImpl`, hay `S3MediaStorageAdapter`.

## Module da refactor

- **post**:
  - `PostController.java`: presigned upload URL (`generatePresignedUploadUrl`), `getContentType`, `resolveMediaType`. Flow xin presigned la BAT BUOC; giu nguyen catch hien co (tra 400 BAD_REQUEST) -> khong nuot loi am tham, van bao loi ro cho client.
  - `PostServiceImpl.java`: `moveUploadUrl`, `relocatePostMediaKey` (khi tao/cap nhat post), `deleteMedia` (khi xoa post/xoa anh bi go). Move media la best-effort (post da luu truoc) -> OPTIONAL, giu graceful degradation hien co. Delete media khi xoa post la cleanup phu -> OPTIONAL, giu swallow + log.
- **chat**:
  - `MessageCommandService.java`: `copyObject` (forward attachment - thuoc flow forward, neu loi se duoc catch(RuntimeException) don dep va rethrow len GlobalExceptionHandler -> BAT BUOC), `deleteMedia` x2 (don file copy khi forward loi, va xoa attachment khi thu hoi tin nhan). Hai cho delete la cleanup phu -> OPTIONAL: doi tu `catch (Exception)` rong sang bat dung `MediaUnavailableException | MediaStorageException` + log warning, khong lam fail nghiep vu chinh (thu hoi/forward van thanh cong).
- **conversation**: khong co file nao goi `S3Service` truc tiep (da khao sat) -> khong dung den.
- **user**:
  - `UserController.java`: `generateUpdateUploadUrl` (update avatar), `generateUploadUrl` (upload avatar). Day la action chinh xin presigned upload -> BAT BUOC: khong nuot exception, de media exception di len GlobalExceptionHandler. Login/register/session khong dung media.
- **story**:
  - `StoryController.java`: `generatePresignedUploadUrl` (xin URL upload media story - BAT BUOC, giu catch tra 400), `deleteMedia` (xoa media khi xoa story - cleanup phu, OPTIONAL, giu swallow + log; action chinh la soft-delete story).
  - `StoryServiceImpl.java`: `relocateStoryMediaKey` khi tao story. Theo pattern hien co, neu relocate loi thi story van tao thanh cong (continue without media) -> giu nguyen OPTIONAL.
- **page**:
  - `PageController.java`: `moveUploadUrl` x2 (gan avatar/cover khi tao page), `generateUpdateUploadUrl` x2 (update avatar/cover), `generateUploadUrl` (xin URL upload). Cac action update avatar/cover la lien quan media truc tiep -> de exception di len.
  - `PageServiceImpl.java`: truoc day inject `S3Service` nhung KHONG dung o bat ky method nao. Da go bo hoan toan field + tham so constructor (khong them `MediaStoragePort` vi khong can). Day la don coupling thua.
- **note/music/notification**: khong co file nao goi `S3Service` truc tiep -> khong dung den.

## Graceful degradation da them

- `MessageCommandService.deleteCopiedForwardAttachments`: bat `MediaUnavailableException | MediaStorageException`, log warning kem object key (khong log secret), tiep tuc don cac key con lai. Khong lam fail flow forward.
- `MessageCommandService.deleteS3Attachments` (xoa attachment khi thu hoi): doi tu `log.error` + `catch (Exception)` sang `catch (MediaUnavailableException | MediaStorageException)` + `log.warn`, khong anh huong ket qua thu hoi tin nhan.
- Cac flow OPTIONAL khac (move/relocate media khi tao post/story, delete media khi xoa post/story) van giu graceful degradation theo pattern goc (try/catch + log, nghiep vu chinh khong fail).
- Cac flow BAT BUOC (xin presigned upload o post/story/user/page) khong nuot exception: media exception (RuntimeException) se di len GlobalExceptionHandler (`MediaUnavailableException` -> 503, `MediaStorageException` -> loi media chuan), khong throw raw AWS/S3 exception ra ngoai.

## Con coupling / rui ro

- Khong con coupling `MediaUrlBuilder` trong 8 file (khong ton tai trong pham vi nay).
- `S3Service` / `common.service.s3` chi con xuat hien trong `modules/media/infrastructure/S3MediaStorageAdapter.java` va doc javadoc cua `MediaStoragePort.java` - deu thuoc Agent 1, hop le.
- Cac flow xin presigned upload (post/story) dang dung `catch (Exception)` san co va tra 400 BAD_REQUEST ngay tai controller, nen media exception bi gom thanh 400 thay vi 503 cua GlobalExceptionHandler. Day la hanh vi co san truoc refactor (khong doi public endpoint/status), nen giu nguyen de tranh thay doi hop dong API. Neu sau nay muon phan biet 503 media-down, can sua rieng cac controller nay (ngoai pham vi yeu cau hien tai).
- `UserController` va `PageController` dung field injection qua constructor thu cong (khong Lombok); da cap nhat ca field + constructor param.

## Kiem tra

- `Grep "S3Service|common.service.s3|modules.media.infrastructure"` trong `modules`: chi con trong `modules/media/infrastructure/S3MediaStorageAdapter.java` va javadoc `MediaStoragePort.java` (thuoc Agent 1). KHONG con trong bat ky business module nao (post/chat/conversation/user/story/page/note/music/notification).
- `mvnw.cmd -o test-compile`: **BUILD SUCCESS** (exit code 0).

## File da sua

1. `modules/user/controller/UserController.java`
2. `modules/chat/service/impl/MessageCommandService.java`
3. `modules/story/service/impl/StoryServiceImpl.java`
4. `modules/story/controller/StoryController.java`
5. `modules/post/service/impl/PostServiceImpl.java`
6. `modules/post/controller/PostController.java`
7. `modules/page/service/impl/PageServiceImpl.java` (go bo field S3Service thua, khong dung)
8. `modules/page/controller/PageController.java`
