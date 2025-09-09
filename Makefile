# Makefile for NotNotes Kotlin/Ktor Server

# Variables (all can be overridden)
IMAGE_NAME ?= notnotes-server
REGISTRY ?= localhost:5000
GIT_HASH ?= $(shell git rev-parse --short HEAD)
GIT_BRANCH ?= $(shell git rev-parse --abbrev-ref HEAD)
GIT_DIRTY ?= $(shell if [ -n "$$(git status --porcelain)" ]; then echo "-dirty"; fi)
BUILD_DATE ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION ?= $(GIT_HASH)$(GIT_DIRTY)

# Full image name with registry (if set)
FULL_IMAGE_NAME ?= $(if $(REGISTRY),$(REGISTRY)/$(IMAGE_NAME),$(IMAGE_NAME))

# Helm targets
HELM_CHART_PATH ?= deploy/notnotes
HELM_RELEASE_NAME ?= notnotes
HELM_NAMESPACE ?= default
JWT_SECRET_FILE ?= .jwt-secret

# Default target
.PHONY: help
help: ## Show this help message
	@echo "NotNotes Server Docker Build & Deploy"
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

.PHONY: info
info: ## Show build information
	@echo "Build Information:"
	@echo "  Image Name:    $(FULL_IMAGE_NAME)"
	@echo "  Git Hash:      $(GIT_HASH)$(GIT_DIRTY)"
	@echo "  Git Branch:    $(GIT_BRANCH)"
	@echo "  Version Tag:   $(VERSION)"
	@echo "  Build Date:    $(BUILD_DATE)"
	@echo "  Registry:      $(REGISTRY)"

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

.PHONY: push
push: ## Push image to registry
	@echo "Pushing $(FULL_IMAGE_NAME):$(VERSION)..."
	docker push $(FULL_IMAGE_NAME):$(VERSION)
	docker push $(FULL_IMAGE_NAME):latest
	@echo "Successfully pushed $(FULL_IMAGE_NAME):$(VERSION) and latest"

.PHONY: run
run: ## Run the built image locally
	@echo "Running $(FULL_IMAGE_NAME):$(VERSION)..."
	docker run -it --rm \
		-p 8080:8080 \
		-e JWT_SECRET="dev-secret-key" \
		-e MONGODB_URI="mongodb://host.docker.internal:27017" \
		$(FULL_IMAGE_NAME):$(VERSION)

.PHONY: clean
clean: ## Remove built images
	@echo "Removing images..."
	-docker rmi $(FULL_IMAGE_NAME):$(VERSION)
	-docker rmi $(FULL_IMAGE_NAME):latest
	@echo "Images removed"

.PHONY: helm-upgrade-dev
helm-upgrade-dev: build push ## Build new image and upgrade/install Helm release
	@echo "Upgrading/Installing Helm release $(HELM_RELEASE_NAME) with image $(FULL_IMAGE_NAME):$(VERSION)..."
	helm upgrade --install $(HELM_RELEASE_NAME) $(HELM_CHART_PATH) \
		--namespace $(HELM_NAMESPACE) \
		--set app.image.repository=$(FULL_IMAGE_NAME) \
		--set app.image.tag=$(VERSION) \
		--set app.jwt.secret="$${JWT_SECRET:-dev-secret-key}" \
		--wait --timeout=300s
	@echo "Deployment complete! Image: $(FULL_IMAGE_NAME):$(VERSION)"

.PHONY: helm-upgrade-prod
helm-upgrade-prod: build push ## Build and upgrade with production settings
	@if [ ! -f "$(JWT_SECRET_FILE)" ]; then \
		echo "Error: JWT secret file '$(JWT_SECRET_FILE)' not found."; \
		echo "Create the file with: echo 'your-production-secret' > $(JWT_SECRET_FILE)"; \
		echo "Make sure $(JWT_SECRET_FILE) is in .gitignore"; \
		exit 1; \
	fi
	$(eval JWT_SECRET := $(shell cat $(JWT_SECRET_FILE)))
	@echo "Upgrading production Helm release $(HELM_RELEASE_NAME)..."
	helm upgrade --install $(HELM_RELEASE_NAME) $(HELM_CHART_PATH) \
		--namespace $(HELM_NAMESPACE) \
		--set app.image.repository=$(FULL_IMAGE_NAME) \
		--set app.image.tag=$(VERSION) \
		--set app.jwt.secret="$(JWT_SECRET)" \
		--set app.replicas=1 \
		--set autoscaling.enabled=true \
		--set mongodb.persistence.enabled=true \
		--set mongodb.persistence.size=20Gi \
		--wait --timeout=600s
	@echo "Production deployment complete! Image: $(FULL_IMAGE_NAME):$(VERSION)"

.PHONY: helm-uninstall
helm-uninstall: ## Uninstall Helm release
	@echo "Uninstalling Helm release $(HELM_RELEASE_NAME)..."
	helm uninstall $(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: helm-logs
helm-logs: ## Show logs from deployed pods
	kubectl logs -l app=$(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE) -f

.PHONY: helm-pods
helm-pods: ## Show running pods
	kubectl get pods -l app=$(HELM_RELEASE_NAME) --namespace $(HELM_NAMESPACE)

.PHONY: create-jwt-secret
create-jwt-secret: ## Create JWT secret file (interactive)
	@echo "Creating JWT secret file at $(JWT_SECRET_FILE)..."
	@read -s -p "Enter JWT secret: " secret && echo "$$secret" > $(JWT_SECRET_FILE)
	@echo ""
	@echo "JWT secret saved to $(JWT_SECRET_FILE)"
	@echo "Make sure to add $(JWT_SECRET_FILE) to .gitignore!"

# Aliases
.PHONY: deploy
deploy: helm-upgrade ## Alias for helm-upgrade

.PHONY: deploy-prod
deploy-prod: helm-upgrade-prod ## Alias for helm-upgrade-prod