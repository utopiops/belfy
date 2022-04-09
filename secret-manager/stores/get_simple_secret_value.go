package stores

import (
	"context"
	"database/sql"
	"errors"

	"gitlab.com/utopiops-water/secret-manager/db"
)

// GetSimpleSecretValue retrieves a simple secret's value by its name
func (store *simpleSecretStore) GetSimpleSecretValue(ctx context.Context, accountID string, name string) (value string, err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = get_simple_secret_value
	}
	var nullableValue sql.NullString
	err = store.db.Connection.Get(&nullableValue, statement, accountID, name)
	if err != nil {
		return
	}
	if nullableValue.Valid {
		value = nullableValue.String
	} else {
		err = errors.New("Not found")
	}
	return
}

// Select query

const get_simple_secret_value = `
SELECT value FROM simple_secrets
WHERE account_id = $1 AND name = $2
`
