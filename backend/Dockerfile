FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY go.mod go.sum ./
RUN go mod download

# Copier le reste du code
COPY . .

# Compiler l'application (le point d'entrée est dans cmd/main.go)
RUN CGO_ENABLED=0 GOOS=linux go build -o /backend-app ./cmd/main.go

# Étape finale avec une image très légère
FROM alpine:latest
WORKDIR /root/

# Copier l'exécutable compilé
COPY --from=builder /backend-app .

# Exposer le port
EXPOSE 8080

# Lancer l'application
CMD ["./backend-app"]
