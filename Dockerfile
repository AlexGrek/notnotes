# Multi-stage build for optimal image size
FROM gradle:8.5-jdk17 AS builder

# Set working directory
WORKDIR /app

# Copy gradle files first for better caching
COPY notnotesserver/gradle/ gradle/
COPY notnotesserver/gradlew .
COPY notnotesserver/gradlew.bat .
COPY notnotesserver/gradle.properties .
COPY notnotesserver/build.gradle.kts .
COPY notnotesserver/settings.gradle.kts .

# Download dependencies (this layer will be cached if dependencies don't change)
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY notnotesserver/src/ src/

# Build the application
RUN ./gradlew buildFatJar --no-daemon

# Production stage - use minimal JRE image
FROM eclipse-temurin:17-jre-alpine

# Install curl for health checks (optional)
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy the JAR file from builder stage
COPY --from=builder /app/build/libs/*-all.jar app.jar

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Environment variables with defaults
ENV PORT=8080
ENV JWT_SECRET=""
ENV JWT_ISSUER="https://notnotes.dcommunity.space"
ENV JWT_AUDIENCE="notnotes-users"
ENV JWT_REALM="NotNotesApp"
ENV JWT_DOMAIN="https://notnotes.dcommunity.space"
ENV JWT_EXPIRATION="36000000"
ENV MONGODB_URI=""
ENV MONGODB_DATABASE_NAME="notnotes"

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# JVM optimizations for containerized environments
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+UseStringDeduplication"

# Run the application
CMD java $JAVA_OPTS -jar app.jar