build:
	docker-compose build

run:
	docker-compose up

tidy:
	docker-compose run --rm git-integration go mod tidy

down:
	docker-compose down --rmi all -v 

.PHONY: build run tidy down