package iuh.fit.edu.gateway.ratelimit;

import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
public class RedisRateLimiter {

    private final ReactiveStringRedisTemplate redisTemplate;

    private static final String LUA_SCRIPT = """
            local key = KEYS[1]
            local max = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local current = tonumber(redis.call('GET', key) or '0')
            if current >= max then
                local ttl = redis.call('TTL', key)
                return ttl > 0 and ttl or window
            end
            current = redis.call('INCR', key)
            if current == 1 then
                redis.call('EXPIRE', key, window)
            end
            return -1
            """;

    private static final RedisScript<Long> SCRIPT =
            RedisScript.of(LUA_SCRIPT, Long.class);

    public RedisRateLimiter(ReactiveStringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * @return Mono(-1) nếu được phép, Mono(retryAfterSeconds) nếu bị chặn
     */
    public Mono<Long> isAllowed(String key, int maxRequests, int windowSeconds) {
        return redisTemplate.execute(
                SCRIPT,
                List.of(key),
                List.of(String.valueOf(maxRequests), String.valueOf(windowSeconds))
        ).single();
    }
}
