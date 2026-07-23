.PHONY: run dev build test lint docker-up docker-down clean

run: ## Lance le serveur (build + exécution directe)
	go run ./cmd/server

dev: ## Lance le serveur avec hot-reload (nécessite `air`)
	air

build: ## Compile le binaire dans bin/server
	go build -o bin/server ./cmd/server

test: ## Lance les tests
	go test ./... -v -race -cover

lint: ## Vérifie le code (go vet + gofmt)
	go vet ./...
	gofmt -l .

docker-up: ## Démarre le service + Postgres via Docker Compose
	docker compose up --build

docker-down: ## Arrête les conteneurs Docker Compose
	docker compose down

clean: ## Supprime les artefacts de build
	rm -rf bin/ tmp/
