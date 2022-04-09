package gitlab

import (
	"context"
	"time"

	"github.com/dgraph-io/ristretto"
)

const (
	gitlabRequestTimeLimit time.Duration = 10 * time.Second
)

type GitlabController struct {
	Cache *ristretto.Cache
}

var noContext = context.Background()
