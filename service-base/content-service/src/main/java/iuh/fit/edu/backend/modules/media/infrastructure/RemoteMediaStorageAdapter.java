/*
 * @ (#) RemoteMediaStorageAdapter.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.media.infrastructure;

import iuh.fit.edu.backend.common.constant.UploadModule;
import iuh.fit.edu.backend.common.dto.response.BulkPresignedRequest;
import iuh.fit.edu.backend.common.dto.response.PresignedUrlResponse;
import iuh.fit.edu.backend.common.exception.MediaStorageException;
import iuh.fit.edu.backend.common.exception.MediaUnavailableException;
import iuh.fit.edu.backend.modules.media.application.MediaStoragePort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Adapter goi sang remote {@code media-service} qua REST de hien thuc {@link MediaStoragePort}.
 *
 * <p>Kich hoat khi {@code media.mode=remote}. Khi do backend khong dung S3 truc tiep ma
 * uy thac moi thao tac storage cho media-service (base URL cau hinh qua
 * {@code media.service.base-url}). Loi mang / 5xx / 503 tu media-service duoc wrap thanh
 * {@link MediaUnavailableException}; cac loi storage khac thanh {@link MediaStorageException},
 * dung dung cac exception ma {@code GlobalExceptionHandler} da xu ly.</p>
 */
@Service
@Slf4j
public class RemoteMediaStorageAdapter implements MediaStoragePort {

    private static final ParameterizedTypeReference<List<PresignedUrlResponse>> PRESIGNED_LIST =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<Map<String, String>> STRING_MAP =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public RemoteMediaStorageAdapter(
            @Value("${media.service.base-url:http://localhost:8081}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl + "/internal/media")
                .build();
    }

    @Override
    public List<PresignedUrlResponse> generateBulkPresignedUploadUrls(BulkPresignedRequest request) {
        return call("generateBulkPresignedUploadUrls", () -> restClient.post()
                .uri("/presigned/bulk")
                .body(request)
                .retrieve()
                .body(PRESIGNED_LIST));
    }

    @Override
    public PresignedUrlResponse generatePresignedUploadUrl(
            UploadModule module, String targetId, String type, String originalFilename, String contentType) {
        return call("generatePresignedUploadUrl", () -> restClient.post()
                .uri(uri -> uri.path("/presigned")
                        .queryParam("module", module)
                        .queryParam("targetId", targetId)
                        .queryParam("type", type)
                        .queryParam("originalFilename", originalFilename)
                        .queryParam("contentType", contentType)
                        .build())
                .retrieve()
                .body(PresignedUrlResponse.class));
    }

    @Override
    public Map<String, String> generateUploadUrl(String type, String extension) {
        return call("generateUploadUrl", () -> restClient.post()
                .uri(uri -> uri.path("/upload-url")
                        .queryParam("type", type)
                        .queryParam("extension", extension)
                        .build())
                .retrieve()
                .body(STRING_MAP));
    }

    @Override
    public Map<String, String> generateUpdateUploadUrl(String type, String id, String extension) {
        return call("generateUpdateUploadUrl", () -> restClient.post()
                .uri(uri -> uri.path("/update-upload-url")
                        .queryParam("type", type)
                        .queryParam("id", id)
                        .queryParam("extension", extension)
                        .build())
                .retrieve()
                .body(STRING_MAP));
    }

    @Override
    public String moveUploadUrl(String type, String id, String url) {
        return call("moveUploadUrl", () -> restClient.post()
                .uri(uri -> uri.path("/move")
                        .queryParam("type", type)
                        .queryParam("id", id)
                        .queryParam("url", url)
                        .build())
                .retrieve()
                .body(String.class));
    }

    @Override
    public String copyObject(UploadModule module, String sourceKey, String destinationKey) {
        return call("copyObject", () -> restClient.post()
                .uri(uri -> uri.path("/copy")
                        .queryParam("module", module)
                        .queryParam("sourceKey", sourceKey)
                        .queryParam("destinationKey", destinationKey)
                        .build())
                .retrieve()
                .body(String.class));
    }

    @Override
    public String relocatePostMediaKey(String sourceKey, String postId, String mediaType) {
        return call("relocatePostMediaKey", () -> restClient.post()
                .uri(uri -> uri.path("/relocate-post")
                        .queryParam("sourceKey", sourceKey)
                        .queryParam("postId", postId)
                        .queryParam("mediaType", mediaType)
                        .build())
                .retrieve()
                .body(String.class));
    }

    @Override
    public String relocateStoryMediaKey(String sourceKey, String storyId, String mediaType) {
        return call("relocateStoryMediaKey", () -> restClient.post()
                .uri(uri -> uri.path("/relocate-story")
                        .queryParam("sourceKey", sourceKey)
                        .queryParam("storyId", storyId)
                        .queryParam("mediaType", mediaType)
                        .build())
                .retrieve()
                .body(String.class));
    }

    @Override
    public void deleteMedia(UploadModule module, String objectKey) {
        call("deleteMedia", () -> restClient.method(HttpMethod.DELETE)
                .uri(uri -> uri
                        .queryParam("module", module)
                        .queryParam("key", objectKey)
                        .build())
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public String getContentType(String extension) {
        return call("getContentType", () -> restClient.get()
                .uri(uri -> uri.path("/content-type")
                        .queryParam("extension", extension)
                        .build())
                .retrieve()
                .body(String.class));
    }

    @Override
    public String resolveMediaType(String extension) {
        return call("resolveMediaType", () -> restClient.get()
                .uri(uri -> uri.path("/media-type")
                        .queryParam("extension", extension)
                        .build())
                .retrieve()
                .body(String.class));
    }

    /**
     * Goi remote media-service va chuyen doi loi HTTP/mang thanh media exception cua boundary.
     *
     * <ul>
     *   <li>503 tu media-service / loi ket noi (ResourceAccessException) -> {@link MediaUnavailableException}.</li>
     *   <li>Cac status loi khac (4xx/5xx) -> {@link MediaStorageException}.</li>
     *   <li>Loi RestClient chung -> {@link MediaUnavailableException}.</li>
     * </ul>
     */
    private <T> T call(String operation, Supplier<T> action) {
        try {
            return action.get();
        } catch (ResourceAccessException ex) {
            // Khong ket noi duoc media-service (connection refused, timeout I/O).
            log.warn("Media service unreachable during '{}': {}", operation, ex.getMessage());
            throw new MediaUnavailableException("Media service is temporarily unavailable", ex);
        } catch (HttpStatusCodeException ex) {
            int status = ex.getStatusCode().value();
            if (status == 503) {
                log.warn("Media service reported unavailable during '{}' (status {})", operation, status);
                throw new MediaUnavailableException("Media service is temporarily unavailable", ex);
            }
            log.error("Media service error during '{}' (status {})", operation, status);
            throw new MediaStorageException("Unable to process media request", ex);
        } catch (RestClientException ex) {
            log.warn("Media service call failed during '{}': {}", operation, ex.getMessage());
            throw new MediaUnavailableException("Media service is temporarily unavailable", ex);
        }
    }
}
