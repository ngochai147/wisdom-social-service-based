package iuh.fit.edu.backend.common.exception;

/**
 * Loi media/S3 tam thoi khong kha dung (vi du loi ket noi mang, S3 timeout,
 * remote media-service xuong tam thoi). Anh xa toi HTTP 503 o GlobalExceptionHandler.
 *
 * <p>Thong diep nen ro rang nhung khong leak bucket name, credential hay stack trace
 * ra ngoai client. Nguyen nhan goc duoc giu trong {@code cause} de log noi bo.</p>
 */
public class MediaUnavailableException extends RuntimeException {

    public MediaUnavailableException(String message) {
        super(message);
    }

    public MediaUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
