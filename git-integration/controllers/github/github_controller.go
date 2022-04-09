package github

import (
	"context"
	"time"

	"github.com/dgraph-io/ristretto"
)

const (
	githubRequestTimeLimit time.Duration = 10 * time.Second
)

type GithubController struct {
	Cache *ristretto.Cache
}

var noContext = context.Background()
