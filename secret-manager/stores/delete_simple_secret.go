package stores

import (
	"context"

	"gitlab.com/utopiops-water/secret-manager/db"
)

// Store the pipeline
func (store *simpleSecretStore) DeleteSimpleSecret(ctx context.Context, accountID string, name string) (err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = delete_simple_secret
	}

	_, err = store.db.Connection.Exec(statement, accountID, name)
	return
}

// queries

const delete_simple_secret = `
DELETE FROM simple_secrets
WHERE account_id = $1 AND name = $2;
`
