# =============================================================
# Emart Login Service - Multi-Stage Dockerfile
# Stage 1: Build | Stage 2: Run
# =============================================================

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copy POM first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build (skip tests in Docker build - tests run in pipeline)
COPY src ./src
RUN mvn clean package -DskipTests -B

# =============================================================
# Stage 2: Runtime (minimal JRE image)
# =============================================================
FROM eclipse-temurin:17-jre-alpine AS runtime

# Security: Run as non-root user
RUN addgroup -S emart && adduser -S emart -G emart

# Application directory
WORKDIR /app

# Create log directory
RUN mkdir -p /var/log/emart && chown emart:emart /var/log/emart

# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar
RUN chown emart:emart app.jar

# Switch to non-root user
USER emart

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:8080/health/ready || exit 1

# JVM tuning for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:InitialRAMPercentage=50.0 \
               -Djava.security.egd=file:/dev/./urandom \
               -Dspring.output.ansi.enabled=never"

# Run
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
