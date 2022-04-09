package stores

import (
	"context"

	"gitlab.com/utopiops-water/secret-manager/db"
)

// GetSimpleSecret retrieves a simple secret by its name
func (store *simpleSecretStore) GetSimpleSecret(ctx context.Context, accountID string, name string) (secret SimpleSecret, err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = get_simple_secret
	}

	r := store.db.Connection.QueryRowx(statement, accountID, name)
	err = r.StructScan(&secret)
	return
}

// Select query

type SimpleSecret struct {
	Name        string `db:"name" json:"name"`
	Description string `db:"description" json:"description"`
	Value       string `db:"value" json:"value"`
}

const get_simple_secret = `
SELECT name, description, value FROM simple_secrets
WHERE account_id = $1 AND name = $2
`
