build:
	docker-compose build

run:
	docker compose up

tidy:
	docker-compose run --rm relational-database-sql-tool go mod tidy

down:
	docker-compose down --rmi all -v 

.PHONY: build run tidy down