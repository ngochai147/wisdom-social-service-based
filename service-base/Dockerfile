# ============================================================
# service-base-wisdom-social
# Build 1 Spring Boot service theo build arg SERVICE_DIR.
# docker-compose.yml dung Dockerfile nay de tao moi service 1 container.
# ============================================================

# ---------- Stage 1: build ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
ARG SERVICE_DIR

# Copy toan bo workspace service-base (xem .dockerignore de bo target/.mvn/...)
COPY . .

# Build 3 lib nen (install vao .m2 cua build stage) roi package service can chay.
# Thu tu bat buoc: common-lib -> persistence-lib -> common-core -> service.
RUN mvn -q -B -f common-lib/pom.xml          install -DskipTests \
 && mvn -q -B -f persistence-lib/pom.xml      install -DskipTests \
 && mvn -q -B -f common-core/pom.xml          install -DskipTests \
 && mvn -q -B -f ${SERVICE_DIR}/pom.xml       package -DskipTests

# ---------- Stage 2: runtime ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
ARG SERVICE_DIR

COPY --from=build /build/${SERVICE_DIR}/target/${SERVICE_DIR}-0.0.1-SNAPSHOT.jar app.jar

# Profile dev de nap application-dev.properties (datasource/mongo/redis...).
# Cac bien moi truong (SPRING_DATASOURCE_URL, SPRING_DATA_MONGODB_URI, AWS_*, ...)
# truyen luc `docker run` qua --env-file/-e.
ENV SPRING_PROFILES_ACTIVE=dev
ENV JAVA_OPTS="-Xms128m -Xmx512m"

EXPOSE 8080 8081 8082 8083 8084 8085

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
