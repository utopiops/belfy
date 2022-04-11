package stores

import (
	"context"

	"gitlab.com/utopiops-water/relational-database-sql-tool/db"
	"gitlab.com/utopiops-water/relational-database-sql-tool/models"
)

func NewSettingsStore(db *db.DB) SettingsStore {
	return &settingsStore{db}
}

type SettingsStore interface {
	// Store a simple secret
	IsEnabled(ctx context.Context, accountID, environmentName, databaseName string) (enabled bool, err error)

	// Health
	GetMigrationHistoryRows() ([]string, error)
	IsCreated(table string) (created bool, err error)

	// RDS
	SetRDSDatabaseSettings(ctx context.Context, rdsSettings *models.RDSSetting) (err error)
	GetRDSDatabaseSettings(ctx context.Context, accountID, environmentName, databaseName string) (setting *models.RDSSetting, err error)
}

type settingsStore struct {
	db *db.DB
}
