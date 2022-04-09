package stores

import (
	"context"

	"gitlab.com/utopiops-water/secret-manager/db"
	"gitlab.com/utopiops-water/secret-manager/models"
)

// Store the pipeline
func (store *simpleSecretStore) CreateSimpleSecret(ctx context.Context, secret *models.SimpleSecret) (err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = create_simple_secret
	}

	_, err = store.db.Connection.Exec(statement, secret.Name, secret.Description, secret.AccountID, secret.Value)
	return err
}

// Insert queries

const create_simple_secret = `
INSERT INTO simple_secrets (name, description, account_id, value)
VALUES ($1, $2, $3, $4) RETURNING id
`
