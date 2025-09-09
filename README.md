# NotNotes Server

A Kotlin/Ktor-based server application with MongoDB backend, containerized with Docker and deployable via Helm.

## Project Structure

```
├── notnotesserver/          # Kotlin/Ktor application
│   ├── src/main/resources/
│   │   └── application.conf # Application configuration
│   ├── build.gradle.kts     # Gradle build file
│   └── ...
├── deploy/
│   └── notnotes/            # Helm chart
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── Dockerfile               # Multi-stage Docker build
├── Makefile                # Build and deployment automation
└── README.md
```

## Quick Start

### Prerequisites

- Docker
- Kubernetes cluster
- Helm 3.x
- Make
- Git

### Development Deployment

```bash
# Build and deploy to Kubernetes (one command!)
make helm-upgrade

# Check deployment status
make helm-pods
make helm-logs

# Access the application
make helm-port-forward
# Visit http://localhost:8080
```

## Docker Operations

### Building Images

```bash
# Build with git hash tag (e.g., abc1234 or abc1234-dirty)
make build

# Build without cache
make build-no-cache

# Development build with branch name (e.g., main-abc1234-dirty)
make dev-build

# Check build info
make info
```

### Running Locally

```bash
# Run interactively with development settings
make run

# Run in background
make run-detached

# View logs
make logs

# Stop container
make stop
```

### Registry Operations

```bash
# Push to GitHub Container Registry
make push REGISTRY=ghcr.io/yourusername

# Push to Docker Hub
make push REGISTRY=yourusername

# Push to custom registry
make push REGISTRY=your-registry.com
```

## Kubernetes Deployment

### Quick Deployment

```bash
# Build new image and deploy/upgrade
make helm-upgrade

# Production deployment (requires JWT_SECRET env var)
export JWT_SECRET="your-production-secret"
make helm-upgrade-prod
```

### Helm Management

```bash
# Install fresh (no upgrade)
make helm-install

# Uninstall completely
make helm-uninstall

# Rollback to previous version
make helm-rollback

# Show release history
make helm-history

# Show current configuration
make helm-values
```

### Monitoring and Debugging

```bash
# Show pod status
make helm-pods

# Follow application logs
make helm-logs

# Show services
make helm-services

# Port forward for local access
make helm-port-forward

# Debug chart rendering
make helm-debug
```

## Configuration

### Environment Variables

The application supports the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `JWT_SECRET` | dev-secret-key | JWT signing secret |
| `JWT_ISSUER` | https://notnotes.dcommunity.space | JWT issuer |
| `JWT_AUDIENCE` | notnotes-users | JWT audience |
| `JWT_REALM` | NotNotesApp | JWT realm |
| `JWT_DOMAIN` | https://notnotes.dcommunity.space | JWT domain |
| `JWT_EXPIRATION` | 36000000 | Token expiration (ms) |
| `MONGODB_URI` | mongodb://localhost:27017 | MongoDB connection string |
| `MONGODB_DATABASE_NAME` | notnotes | Database name |

### Helm Configuration

Key Helm values you can override:

```yaml
app:
  image:
    repository: notnotes-server
    tag: latest
  replicas: 2
  jwt:
    secret: "change-me-in-production"

mongodb:
  persistence:
    enabled: true
    size: 10Gi

ingress:
  enabled: false
  hosts:
    - host: notnotes.yourdomain.com

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
```

### Custom Deployment

```bash
# Deploy with custom values
helm upgrade --install notnotes deploy/notnotes \
  --set app.image.tag=$(git rev-parse --short HEAD) \
  --set app.jwt.secret="your-secret" \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host="notnotes.yourdomain.com"

# Or use values file
helm upgrade --install notnotes deploy/notnotes -f custom-values.yaml
```

## Development Workflow

### Typical Development Cycle

```bash
# 1. Make code changes
vim notnotesserver/src/main/kotlin/...

# 2. Build and deploy (rebuilds image automatically)
make helm-upgrade

# 3. Check deployment
make helm-pods

# 4. View logs
make helm-logs

# 5. Test locally
make helm-port-forward
# Test at http://localhost:8080

# 6. Iterate
```

### Working with Dirty Git State

The build system automatically appends `-dirty` to image tags when you have uncommitted changes:

```bash
# Clean git state: notnotes-server:abc1234
# Dirty git state: notnotes-server:abc1234-dirty
```

This makes it easy to track which images were built from uncommitted code.

## Production Deployment

### Production Checklist

1. **Set JWT Secret**: Export `JWT_SECRET` environment variable
2. **Configure MongoDB**: Set up persistent storage
3. **Enable Ingress**: Configure domain and TLS
4. **Resource Limits**: Adjust CPU/memory based on load
5. **Enable Autoscaling**: Configure HPA for traffic spikes

### Production Deployment

```bash
# Set production JWT secret
export JWT_SECRET="your-super-secure-production-secret"

# Deploy with production settings
make helm-upgrade-prod
```

This automatically configures:
- 3 replicas
- Horizontal Pod Autoscaler enabled
- 20Gi MongoDB persistent storage
- Production resource limits

### Production with Ingress

```bash
# Deploy with custom domain
helm upgrade --install notnotes deploy/notnotes \
  --set app.image.tag=$(git rev-parse --short HEAD) \
  --set app.jwt.secret="$JWT_SECRET" \
  --set app.replicas=3 \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host="api.yourdomain.com" \
  --set autoscaling.enabled=true
```

## Troubleshooting

### Common Issues

**Image not found:**
```bash
# Check if image was built
docker images | grep notnotes-server

# Rebuild image
make build
```

**Pod not starting:**
```bash
# Check pod status
make helm-pods

# Check pod logs
make helm-logs

# Describe pod for events
kubectl describe pod -l app=notnotes
```

**MongoDB connection issues:**
```bash
# Check MongoDB pod
kubectl get pods -l app=notnotes-mongodb

# Check MongoDB logs
kubectl logs -l app=notnotes-mongodb
```

**Configuration issues:**
```bash
# Check current configuration
make helm-values

# Debug rendered templates
make helm-debug
```

### Accessing Services

**Application:**
```bash
# Port forward to application
make helm-port-forward
# Access at http://localhost:8080

# Or get service endpoint
kubectl get services
```

**MongoDB (for debugging):**
```bash
# Port forward to MongoDB
kubectl port-forward service/notnotes-mongodb 27017:27017

# Connect with mongosh
mongosh mongodb://localhost:27017/notnotes
```

## Available Make Targets

### Build Targets
- `make build` - Build Docker image with git hash tag
- `make build-no-cache` - Build without cache
- `make dev-build` - Build with branch name tag
- `make info` - Show build information

### Docker Targets  
- `make run` - Run container interactively
- `make run-detached` - Run container in background
- `make logs` - Show container logs
- `make stop` - Stop running container
- `make push REGISTRY=...` - Push to registry

### Helm Targets
- `make helm-upgrade` - **Main deployment target** (build + deploy)
- `make helm-upgrade-prod` - Production deployment
- `make helm-install` - Fresh install
- `make helm-uninstall` - Remove deployment
- `make helm-status` - Show deployment status
- `make helm-logs` - Show pod logs
- `make helm-pods` - Show running pods
- `make helm-port-forward` - Port forward to app
- `make helm-rollback` - Rollback deployment

### Utility Targets
- `make clean` - Remove built images
- `make help` - Show all targets

## License

WTFPL
