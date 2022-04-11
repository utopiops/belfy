package bitbucket

import (
	"context"
	"time"

	"github.com/dgraph-io/ristretto"
)

const (
	bitbucketRequestTimeLimit time.Duration = 10 * time.Second
)

type BitbucketController struct {
	Cache *ristretto.Cache
}

var noContext = context.Background()
var bitbucketAccessTokenUrl = "https://bitbucket.org/site/oauth2/access_token"
