package stores

import (
	"context"

	"gitlab.com/utopiops-water/secret-manager/db"
)

// Store the pipeline
func (store *simpleSecretStore) UpdateSimpleSecret(ctx context.Context, accountID string, name string, value string) (err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = update_simple_secret
	}

	_, err = store.db.Connection.Exec(statement, accountID, name, value)
	return
}

// Insert queries

const update_simple_secret = `
UPDATE simple_secrets (name, account_id, value)
VALUES ($3)
WHERE account_id = $1 AND name = $2
RETURNING id
`
