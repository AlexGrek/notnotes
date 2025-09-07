mongo-dev-podman:
	podman run -d \
  		--name mongodb \
  		-p 27017:27017 \
  		-v mongodb_data:/data/db \
  		--memory=1g \
  		--cpus=2 \
  		docker.io/library/mongo:7
