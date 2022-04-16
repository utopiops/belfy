docker_run: node_modules
	docker-compose up

node_modules: package.json
	docker-compose run api yarn install

.PHONEY: docker_run