package iuh.fit.edu.media.web;

import iuh.fit.edu.backend.common.exception.MediaStorageException;
import iuh.fit.edu.backend.common.exception.MediaUnavailableException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class MediaExceptionHandler {

    @ExceptionHandler(MediaUnavailableException.class)
    public ResponseEntity<Map<String, String>> handleMediaUnavailable(MediaUnavailableException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Media service is temporarily unavailable"));
    }

    @ExceptionHandler(MediaStorageException.class)
    public ResponseEntity<Map<String, String>> handleMediaStorage(MediaStorageException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", "Unable to process media request"));
    }
}
