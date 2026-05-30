package iuh.fit.edu.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * API Gateway cua service-base.
 *
 * <p>La entry-point duy nhat (mac dinh port 8080) cho {@code frontend-web}:
 * frontend goi het qua {@code /api/**} (REST) va {@code /ws} (SockJS/WebSocket),
 * gateway route sang dung microservice ben trong.
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
