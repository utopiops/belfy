package cloudwatch

import (
	"context"

	"github.com/dgraph-io/ristretto"
)

type CloudwatchController struct {
	Cache *ristretto.Cache
}

var noContext = context.Background()
