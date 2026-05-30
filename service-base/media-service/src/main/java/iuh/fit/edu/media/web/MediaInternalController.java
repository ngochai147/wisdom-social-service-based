package iuh.fit.edu.media.web;

import iuh.fit.edu.backend.common.constant.UploadModule;
import iuh.fit.edu.backend.common.dto.response.BulkPresignedRequest;
import iuh.fit.edu.backend.common.dto.response.PresignedUrlResponse;
import iuh.fit.edu.media.service.S3Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/media")
public class MediaInternalController {

    private final S3Service s3Service;
    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${app.cdn-domain}")
    private String cdnDomain;

    public MediaInternalController(S3Service s3Service, S3Client s3Client) {
        this.s3Service = s3Service;
        this.s3Client = s3Client;
    }

    @PostMapping("/presigned/bulk")
    public List<PresignedUrlResponse> generateBulkPresignedUrls(@RequestBody BulkPresignedRequest req) {
        return s3Service.generateMultiplePresignedUrls(req);
    }

    @PostMapping("/presigned")
    public PresignedUrlResponse generatePresignedUrl(
            @RequestParam UploadModule module,
            @RequestParam String targetId,
            @RequestParam String type,
            @RequestParam String originalFilename,
            @RequestParam String contentType) {
        return s3Service.generatePresignedUrl(module, targetId, type, originalFilename, contentType);
    }

    @PostMapping("/upload-url")
    public Map<String, String> generateUploadUrl(
            @RequestParam String type,
            @RequestParam String extension) {
        return s3Service.generateUploadUrl(type, extension);
    }

    @PostMapping("/update-upload-url")
    public Map<String, String> generateUpdateUploadUrl(
            @RequestParam String type,
            @RequestParam String id,
            @RequestParam String extension) {
        return s3Service.generateUpdateUploadUrl(type, id, extension);
    }

    @PostMapping("/move")
    public String moveUploadUrl(
            @RequestParam String type,
            @RequestParam String id,
            @RequestParam String url) {
        return s3Service.moveUploadUrl(type, id, url);
    }

    @PostMapping("/copy")
    public String copyObject(
            @RequestParam UploadModule module,
            @RequestParam String sourceKey,
            @RequestParam String destinationKey) {
        return s3Service.copyObject(module, sourceKey, destinationKey);
    }

    @PostMapping("/relocate-post")
    public String relocatePostMediaKey(
            @RequestParam String sourceKey,
            @RequestParam String postId,
            @RequestParam String mediaType) {
        return s3Service.relocatePostMediaKey(sourceKey, postId, mediaType);
    }

    @PostMapping("/relocate-story")
    public String relocateStoryMediaKey(
            @RequestParam String sourceKey,
            @RequestParam String storyId,
            @RequestParam String mediaType) {
        return s3Service.relocateStoryMediaKey(sourceKey, storyId, mediaType);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteByKey(
            @RequestParam UploadModule module,
            @RequestParam String key) {
        s3Service.deleteByKey(module, key);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/content-type")
    public String getContentType(@RequestParam String extension) {
        return s3Service.getContentType(extension);
    }

    @GetMapping("/media-type")
    public String resolveMediaType(@RequestParam String extension) {
        return s3Service.resolveMediaType(extension);
    }

    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadFile(@RequestParam String url) {
        String objectKey = normalizeS3ObjectKey(url);
        if (objectKey == null || objectKey.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        ResponseBytes<GetObjectResponse> responseBytes = s3Client.getObjectAsBytes(
                GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(objectKey)
                        .build()
        );
        GetObjectResponse objectResponse = responseBytes.response();
        String contentType = objectResponse.contentType() == null || objectResponse.contentType().isBlank()
                ? resolveContentType(objectKey)
                : objectResponse.contentType();
        String fileName = objectKey.substring(objectKey.lastIndexOf('/') + 1);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(responseBytes.asByteArray().length)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(fileName, StandardCharsets.UTF_8)
                                .build()
                                .toString()
                )
                .body(responseBytes.asByteArray());
    }

    private String normalizeS3ObjectKey(String keyOrUrl) {
        if (keyOrUrl == null) return null;
        String normalized = URLDecoder.decode(keyOrUrl.trim(), StandardCharsets.UTF_8);
        int queryIndex = normalized.indexOf('?');
        if (queryIndex >= 0) {
            normalized = normalized.substring(0, queryIndex);
        }
        int fragmentIndex = normalized.indexOf('#');
        if (fragmentIndex >= 0) {
            normalized = normalized.substring(0, fragmentIndex);
        }
        if (cdnDomain != null && !cdnDomain.isBlank() && normalized.startsWith(cdnDomain)) {
            normalized = normalized.substring(cdnDomain.length());
        }
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        for (String root : List.of("conversations/", "users/", "posts/", "stories/")) {
            int rootIndex = normalized.indexOf(root);
            if (rootIndex >= 0) {
                return normalized.substring(rootIndex);
            }
        }
        return null;
    }

    private String resolveContentType(String objectKey) {
        String lower = objectKey.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".avif")) return "image/avif";
        return "application/octet-stream";
    }
}
