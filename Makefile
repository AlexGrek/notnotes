mongo-dev-podman:
	podman run -d \
  		--name mongodb \
  		-p 27017:27017 \
  		-v mongodb_data:/data/db \
  		--memory=1g \
  		--cpus=2 \
  		docker.io/library/mongo:7

# Makefile for NotNotes Kotlin/Ktor Server

# Variables
IMAGE_NAME := notnotes-server
REGISTRY := # Set to your registry if needed (e.g., ghcr.io/username)
GIT_HASH := $(shell git rev-parse --short HEAD)
GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION := $(GIT_HASH)

# Full image name with registry (if set)
FULL_IMAGE_NAME := $(if $(REGISTRY),$(REGISTRY)/$(IMAGE_NAME),$(IMAGE_NAME))

# Default target
.PHONY: help
help: ## Show this help message
	@echo "NotNotes Server Docker Build"
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

.PHONY: info
info: ## Show build information
	@echo "Build Information:"
	@echo "  Image Name:    $(FULL_IMAGE_NAME)"
	@echo "  Git Hash:      $(GIT_HASH)"
	@echo "  Git Branch:    $(GIT_BRANCH)"
	@echo "  Version Tag:   $(VERSION)"
	@echo "  Build Date:    $(BUILD_DATE)"
	@echo "  Registry:      $(if $(REGISTRY),$(REGISTRY),<none>)"

.PHONY: build
build: ## Build Docker image with git hash tag
	@echo "Building $(FULL_IMAGE_NAME):$(VERSION)..."
	docker build \
		--build-arg BUILD_DATE="$(BUILD_DATE)" \
		--build-arg GIT_HASH="$(GIT_HASH)" \
		--build-arg GIT_BRANCH="$(GIT_BRANCH)" \
		-t $(FULL_IMAGE_NAME):$(VERSION) \
		-t $(FULL_IMAGE_NAME):latest \
		.
	@echo "Successfully built $(FULL_IMAGE_NAME):$(VERSION)"

.PHONY: build-no-cache
build-no-cache: ## Build Docker image without using cache
	@echo "Building $(FULL_IMAGE_NAME):$(VERSION) without cache..."
	docker build \
		--no-cache \
		--build-arg BUILD_DATE="$(BUILD_DATE)" \
		--build-arg GIT_HASH="$(GIT_HASH)" \
		--build-arg GIT_BRANCH="$(GIT_BRANCH)" \
		-t $(FULL_IMAGE_NAME):$(VERSION) \
		-t $(FULL_IMAGE_NAME):latest \
		.
	@echo "Successfully built $(FULL_IMAGE_NAME):$(VERSION)"

.PHONY: run
run: ## Run the built image locally
	@echo "Running $(FULL_IMAGE_NAME):$(VERSION)..."
	docker run -it --rm \
		-p 8080:8080 \
		-e JWT_SECRET="dev-secret-key" \
		-e MONGODB_URI="mongodb://host.docker.internal:27017" \
		$(FULL_IMAGE_NAME):$(VERSION)

.PHONY: run-detached
run-detached: ## Run the built image in detached mode
	@echo "Running $(FULL_IMAGE_NAME):$(VERSION) in detached mode..."
	docker run -d \
		-p 8080:8080 \
		-e JWT_SECRET="dev-secret-key" \
		-e MONGODB_URI="mongodb://host.docker.internal:27017" \
		--name notnotes-server \
		$(FULL_IMAGE_NAME):$(VERSION)
	@echo "Container started. Use 'make logs' to view logs or 'make stop' to stop."

.PHONY: logs
logs: ## Show logs from running container
	docker logs -f notnotes-server

.PHONY: stop
stop: ## Stop and remove running container
	-docker stop notnotes-server
	-docker rm notnotes-server

.PHONY: push
push: ## Push image to registry (requires REGISTRY to be set)
ifndef REGISTRY
	@echo "Error: REGISTRY variable not set. Use: make push REGISTRY=your-registry.com"
	@exit 1
endif
	@echo "Pushing $(FULL_IMAGE_NAME):$(VERSION)..."
	docker push $(FULL_IMAGE_NAME):$(VERSION)
	docker push $(FULL_IMAGE_NAME):latest
	@echo "Successfully pushed $(FULL_IMAGE_NAME):$(VERSION) and latest"

.PHONY: tag
tag: ## Create additional tags for the image
ifdef TAG
	@echo "Tagging $(FULL_IMAGE_NAME):$(VERSION) as $(FULL_IMAGE_NAME):$(TAG)..."
	docker tag $(FULL_IMAGE_NAME):$(VERSION) $(FULL_IMAGE_NAME):$(TAG)
	@echo "Successfully tagged as $(TAG)"
else
	@echo "Error: TAG variable not set. Use: make tag TAG=your-tag"
	@exit 1
endif

.PHONY: clean
clean: ## Remove built images
	@echo "Removing images..."
	-docker rmi $(FULL_IMAGE_NAME):$(VERSION)
	-docker rmi $(FULL_IMAGE_NAME):latest
	@echo "Images removed"

.PHONY: clean-all
clean-all: stop clean ## Stop containers and remove all images
	@echo "Cleaning up all containers and images..."
	-docker system prune -f

.PHONY: shell
shell: ## Open shell in running container
	docker exec -it notnotes-server /bin/sh

.PHONY: inspect
inspect: ## Inspect the built image
	docker inspect $(FULL_IMAGE_NAME):$(VERSION)

.PHONY: history
history: ## Show image build history
	docker history $(FULL_IMAGE_NAME):$(VERSION)

.PHONY: size
size: ## Show image size
	@echo "Image sizes:"
	@docker images $(FULL_IMAGE_NAME) --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# Development targets
.PHONY: dev-build
dev-build: ## Quick build for development (with current branch as tag)
	$(MAKE) build VERSION=$(GIT_BRANCH)-$(GIT_HASH)$(GIT_DIRTY)

.PHONY: release
release: build push ## Build and push release (requires REGISTRY)

# CI/CD targets
.PHONY: ci-build
ci-build: ## Build for CI (no latest tag)
	@echo "Building $(FULL_IMAGE_NAME):$(VERSION) for CI..."
	docker build \
		--build-arg BUILD_DATE="$(BUILD_DATE)" \
		--build-arg GIT_HASH="$(GIT_HASH)" \
		--build-arg GIT_BRANCH="$(GIT_BRANCH)" \
		-t $(FULL_IMAGE_NAME):$(VERSION) \
		.

.PHONY: check-git
check-git: ## Check git status (fails if working directory is dirty)
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "Error: Working directory is dirty. Commit your changes first."; \
		exit 1; \
	fi
	@echo "Git working directory is clean"


# Helm targets
HELM_CHART_PATH := deploy/notnotes
HELM_RELEASE_NAME := notnotes
HELM_NAMESPACE := default

.PHONY: helm-install
helm-install: ## Install Helm chart
	@echo "Installing Helm chart $(HELM_RELEASE_NAME)..."
	helm install $(HELM_RELEASE_NAME) $(HELM_CHART_PATH) \
		--namespace $(HELM_NAMESPACE) \
		--set app.image.repository=$(FULL_IMAGE_NAME) \
		--set app.image.tag=$(VERSION)

.PHONY: helm-upgrade
helm-upgrade: build ## Build new image and upgrade/install Helm release
	@echo "Upgrading/Installing Helm release $(HELM_RELEASE_NAME) with image $(FULL_IMAGE_NAME):$(VERSION)..."
	helm upgrade --install $(HELM_RELEASE_NAME) $(HELM_CHART_PATH) \
		--namespace $(HELM_NAMESPACE) \
		--set app.image.repository=$(FULL_IMAGE_NAME) \
		--set app.image.tag=$(VERSION) \
		--set app.jwt.secret="${JWT_SECRET:-dev-secret-key}" \
		--wait --timeout=300s
	@echo "Deployment complete! Image: $(FULL_IMAGE_NAME):$(VERSION)"

.PHONY: helm-upgrade-prod
helm-upgrade-prod: build ## Build and upgrade with production settings
ifndef JWT_SECRET
	@echo "Error: JWT_SECRET environment variable required for production deployment"
	@exit 1
endif
	@echo "Upgrading production Helm release $(HELM_RELEASE_NAME)..."
	helm upgrade --install $(HELM_RELEASE_NAME) $(HELM_CHART_PATH) \
		--namespace $(HELM_NAMESPACE) \
		--set app.image.repository=$(FULL_IMAGE_NAME) \
		--set app.image.tag=$(VERSION) \
		--set app.jwt.secret="$(JWT_SECRET)" \
		--set app.replicas=3 \
		--set autoscaling.enabled=true \
		--set mongodb.persistence.enabled=true \
		--set mongodb.persistence.size=20Gi \
		--wait --timeout=600s
	@echo "Production deployment complete! Image: $(FULL_IMAGE_NAME):$(VERSION)"

.PHONY: helm-uninstall
helm-uninstall: ## Uninstall Helm release
	@echo "Uninstalling Helm release $(HELM_RELEASE_NAME)..."
	helm uninstall $(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: helm-status
helm-status: ## Show Helm release status
	helm status $(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: helm-logs
helm-logs: ## Show logs from deployed pods
	kubectl logs -l app=$(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE) -f

.PHONY: helm-pods
helm-pods: ## Show running pods
	kubectl get pods -l app=$(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: helm-services
helm-services: ## Show services
	kubectl get services -l app=$(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: helm-port-forward
helm-port-forward: ## Port forward to the application (8080:80)
	@echo "Port forwarding to $(HELM_RELEASE_NAME) service..."
	kubectl port-forward service/$(HELM_RELEASE_NAME)-service 8080:80 --namespace $(HELM_NAMESPACE)

.PHONY: helm-debug
helm-debug: ## Debug Helm chart rendering
	helm template $(HELM_RELEASE_NAME) $(HELM_CHART_PATH) \
		--namespace $(HELM_NAMESPACE) \
		--set app.image.repository=$(FULL_IMAGE_NAME) \
		--set app.image.tag=$(VERSION)

.PHONY: helm-values
helm-values: ## Show current Helm values
	helm get values $(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: helm-rollback
helm-rollback: ## Rollback to previous Helm release
	@echo "Rolling back $(HELM_RELEASE_NAME)..."
	helm rollback $(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: helm-history
helm-history: ## Show Helm release history
	helm history $(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

# Combined targets
.PHONY: deploy
deploy: helm-upgrade ## Alias for helm-upgrade

.PHONY: deploy-prod
deploy-prod: helm-upgrade-prod ## Alias for helm-upgrade-prod