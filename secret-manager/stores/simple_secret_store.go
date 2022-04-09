package stores

import (
	"context"

	"gitlab.com/utopiops-water/secret-manager/db"
	"gitlab.com/utopiops-water/secret-manager/models"
)

func New(db *db.DB) SimpleSecretStore {
	return &simpleSecretStore{db}
}

type SimpleSecretStore interface {
	// Store a simple secret
	CreateSimpleSecret(context.Context, *models.SimpleSecret) error

	// GetSimpleSecretValue retrieves a simple secret's value by its name
	GetSimpleSecretValue(context.Context, string, string) (string, error)

	// GetSimpleSecret retrieves a simple secret by its name
	GetSimpleSecret(context.Context, string, string) (SimpleSecret, error)

	// ListSimpleSecrets retrieves the names of the simple secrets for an account
	ListSimpleSecrets(ctx context.Context, accountID string) (secrets []struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}, err error)

	// UpdateSimpleSecret updates the value of a simple secret
	UpdateSimpleSecret(ctx context.Context, accountID string, name string, value string) error

	// DeleteSimpleSecret deletes a simple secret
	DeleteSimpleSecret(ctx context.Context, accountID string, name string) error

	// GetMigrationHistoryRows retrieves rows of migration_history table
	GetMigrationHistoryRows() ([]string, error)

	// IsCreated checks that a table is really created or not
	IsCreated(table string) (created bool, err error)
}

type simpleSecretStore struct {
	db *db.DB
}
