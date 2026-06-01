package iuh.fit.edu.gateway.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@ConfigurationProperties(prefix = "rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;
    private Limit anonymous = new Limit(60, 60);
    private Limit authenticated = new Limit(200, 60);
    private Map<String, Limit> routes = new HashMap<>();

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public Limit getAnonymous() { return anonymous; }
    public void setAnonymous(Limit anonymous) { this.anonymous = anonymous; }

    public Limit getAuthenticated() { return authenticated; }
    public void setAuthenticated(Limit authenticated) { this.authenticated = authenticated; }

    public Map<String, Limit> getRoutes() { return routes; }
    public void setRoutes(Map<String, Limit> routes) { this.routes = routes; }

    public static class Limit {
        private int maxRequests;
        private int windowSeconds;

        public Limit() {}

        public Limit(int maxRequests, int windowSeconds) {
            this.maxRequests = maxRequests;
            this.windowSeconds = windowSeconds;
        }

        public int getMaxRequests() { return maxRequests; }
        public void setMaxRequests(int maxRequests) { this.maxRequests = maxRequests; }

        public int getWindowSeconds() { return windowSeconds; }
        public void setWindowSeconds(int windowSeconds) { this.windowSeconds = windowSeconds; }
    }
}
