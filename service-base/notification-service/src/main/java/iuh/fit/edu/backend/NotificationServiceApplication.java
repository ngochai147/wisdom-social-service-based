package iuh.fit.edu.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

// Chi nhan nhung interface ke thua JpaRepository la JPA
@EnableJpaRepositories(
        basePackages = "iuh.fit.edu.backend.modules",
        includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = org.springframework.data.jpa.repository.JpaRepository.class)
)
// Chi nhan nhung interface ke thua MongoRepository la MongoDB
@EnableMongoRepositories(
        basePackages = "iuh.fit.edu.backend.modules",
        includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = org.springframework.data.mongodb.repository.MongoRepository.class)
)
@SpringBootApplication(exclude = {
        org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration.class
})
@EnableScheduling
public class NotificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }

}
