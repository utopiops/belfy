docker_run: node_modules
	docker-compose up

node_modules: package.json
	docker-compose run infrastructure-worker yarn install

.PHONEY: docker_run