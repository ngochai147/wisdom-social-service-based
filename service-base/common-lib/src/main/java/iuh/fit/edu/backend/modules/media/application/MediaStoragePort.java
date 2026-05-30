package iuh.fit.edu.backend.modules.media.application;

import iuh.fit.edu.backend.common.constant.UploadModule;
import iuh.fit.edu.backend.common.dto.response.BulkPresignedRequest;
import iuh.fit.edu.backend.common.dto.response.PresignedUrlResponse;

import java.util.List;
import java.util.Map;

/**
 * Media application boundary.
 *
 * <p>Cong contract de cac module business goi media storage ma khong phu thuoc
 * truc tiep vao {@code S3Service}. Implementation hien tai la
 * {@code S3MediaStorageAdapter} (boc {@code S3Service}). Sau nay co the thay
 * bang remote media-service ma khong can sua cac module business.</p>
 *
 * <p>Signature duoc thiet ke khop voi contract that ma {@code FileController} va
 * cac module business dang dung, de adapter chi viec delegate. Loi tu S3/AWS se
 * duoc adapter wrap thanh {@code MediaStorageException} /
 * {@code MediaUnavailableException}.</p>
 */
public interface MediaStoragePort {

    /**
     * Sinh nhieu presigned upload URL trong mot lan (dung cho chat/conversation bulk upload).
     */
    List<PresignedUrlResponse> generateBulkPresignedUploadUrls(BulkPresignedRequest request);

    /**
     * Sinh mot presigned upload URL cho mot file thuoc mot module/target cu the.
     */
    PresignedUrlResponse generatePresignedUploadUrl(
            UploadModule module,
            String targetId,
            String type,
            String originalFilename,
            String contentType
    );

    /**
     * Sinh presigned URL upload anh dai dien/anh bia vao thu muc tam (temp).
     * Tra ve map gom uploadUrl, imageUrl, uuid, extension theo pattern hien co.
     */
    Map<String, String> generateUploadUrl(String type, String extension);

    /**
     * Sinh presigned URL upload anh dai dien/anh bia gan truc tiep vao id cua entity.
     * Tra ve map gom uploadUrl, imageUrl.
     */
    Map<String, String> generateUpdateUploadUrl(String type, String id, String extension);

    /**
     * Di chuyen object tu thu muc temp sang thu muc gan voi id that. Tra ve key cuoi cung.
     */
    String moveUploadUrl(String type, String id, String url);

    /**
     * Sao chep object trong storage tu sourceKey sang destinationKey. Tra ve destinationKey.
     */
    String copyObject(UploadModule module, String sourceKey, String destinationKey);

    /**
     * Di chuyen/relocate media key cua post sang vi tri chinh thuc theo postId. Tra ve key cuoi cung.
     */
    String relocatePostMediaKey(String sourceKey, String postId, String mediaType);

    /**
     * Di chuyen/relocate media key cua story sang vi tri chinh thuc theo storyId. Tra ve key cuoi cung.
     */
    String relocateStoryMediaKey(String sourceKey, String storyId, String mediaType);

    /**
     * Xoa object media theo key, gioi han trong pham vi module.
     */
    void deleteMedia(UploadModule module, String objectKey);

    /**
     * Suy ra content type (MIME) tu extension.
     */
    String getContentType(String extension);

    /**
     * Suy ra loai media (IMAGE/VIDEO/FILE) tu extension.
     */
    String resolveMediaType(String extension);
}
