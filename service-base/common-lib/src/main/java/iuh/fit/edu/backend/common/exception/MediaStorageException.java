package iuh.fit.edu.backend.common.exception;

/**
 * Loi storage media noi chung (vi du copy/delete/relocate that bai, loi cau hinh,
 * loi khong xac dinh tu lop S3/AWS hoac tu remote media-service).
 *
 * <p>Thong diep nen ro rang nhung khong leak bucket name, credential hay stack trace
 * ra ngoai client. Nguyen nhan goc duoc giu trong {@code cause} de log noi bo.</p>
 */
public class MediaStorageException extends RuntimeException {

    public MediaStorageException(String message) {
        super(message);
    }

    public MediaStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
