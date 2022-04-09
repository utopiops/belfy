package rds

import (
	"context"

	"github.com/dgraph-io/ristretto"
)

type RDSController struct {
	Cache *ristretto.Cache
}

var noContext = context.Background()
