FROM golang:1.16.4 AS go-build

ENV GO111MODULE=on

ARG GITLAB_ACCESS_USERNAME
ARG GITLAB_ACCESS_PASSWORD
RUN echo https://${GITLAB_ACCESS_USERNAME}:${GITLAB_ACCESS_PASSWORD}@gitlab.com >> ~/.git-credentials && git config --global credential.helper 'store --file ~/.git-credentials'

WORKDIR /go/src/gitlab.com/utopiops-water/secret-manager

ENV GONOSUMDB=gitlab.com/utopiops-water
ENV GOPRIVATE=gitlab.com/utopiops-water/*

COPY go.mod .
COPY go.sum .

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o secret-manager .

FROM alpine:3.9.5
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=go-build /go/src/gitlab.com/utopiops-water/secret-manager .
ENTRYPOINT ["./secret-manager"]