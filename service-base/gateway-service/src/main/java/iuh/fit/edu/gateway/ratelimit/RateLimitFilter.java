package iuh.fit.edu.gateway.ratelimit;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
@EnableConfigurationProperties(RateLimitProperties.class)
public class RateLimitFilter implements GlobalFilter, Ordered {

    private final RedisRateLimiter rateLimiter;
    private final RateLimitProperties props;

    public RateLimitFilter(RedisRateLimiter rateLimiter, RateLimitProperties props) {
        this.rateLimiter = rateLimiter;
        this.props = props;
    }

    @Override
    public int getOrder() {
        return -1;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!props.isEnabled()) {
            return chain.filter(exchange);
        }

        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        if (path.startsWith("/ws") || path.startsWith("/actuator")) {
            return chain.filter(exchange);
        }

        String userId = extractUserId(request);
        boolean authenticated = userId != null;

        RateLimitProperties.Limit limit = resolveLimit(path, authenticated);
        String redisKey = buildKey(path, authenticated ? userId : resolveIp(request));

        return rateLimiter.isAllowed(redisKey, limit.getMaxRequests(), limit.getWindowSeconds())
                .flatMap(retryAfter -> {
                    if (retryAfter < 0) {
                        return chain.filter(exchange);
                    }
                    return reject(exchange, retryAfter);
                });
    }

    private RateLimitProperties.Limit resolveLimit(String path, boolean authenticated) {
        for (Map.Entry<String, RateLimitProperties.Limit> entry : props.getRoutes().entrySet()) {
            if (path.startsWith("/" + entry.getKey())) {
                return entry.getValue();
            }
        }
        return authenticated ? props.getAuthenticated() : props.getAnonymous();
    }

    private String buildKey(String path, String identifier) {
        String routePrefix = "global";
        for (String route : props.getRoutes().keySet()) {
            if (path.startsWith("/" + route)) {
                routePrefix = route.replace("/", ":");
                break;
            }
        }
        return "rl:" + routePrefix + ":" + identifier;
    }

    private String extractUserId(ServerHttpRequest request) {
        HttpCookie cookie = request.getCookies().getFirst("accessToken");
        if (cookie == null) {
            return null;
        }
        try {
            DecodedJWT jwt = JWT.decode(cookie.getValue());
            return jwt.getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveIp(ServerHttpRequest request) {
        String xff = request.getHeaders().getFirst("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        InetSocketAddress addr = request.getRemoteAddress();
        return addr != null ? addr.getAddress().getHostAddress() : "unknown";
    }

    private Mono<Void> reject(ServerWebExchange exchange, long retryAfter) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        response.getHeaders().set("Retry-After", String.valueOf(retryAfter));

        String body = """
                {"code":429,"message":"Quá nhiều request. Vui lòng thử lại sau %d giây.","data":{"retryAfter":%d}}"""
                .formatted(retryAfter, retryAfter);

        DataBuffer buffer = response.bufferFactory()
                .wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
