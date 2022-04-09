package stores

import (
	"context"
	"fmt"

	"gitlab.com/utopiops-water/secret-manager/db"
)

// Store the pipeline
func (store *simpleSecretStore) ListSimpleSecrets(ctx context.Context, accountID string) (secrets []struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}, err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = list_simple_secrets
	}
	err = store.db.Connection.Select(&secrets, statement, accountID)
	if err != nil {
		fmt.Println(err.Error())
	}
	return
}

// Select query

const list_simple_secrets = `
SELECT name, description FROM simple_secrets
WHERE account_id = $1;
`
