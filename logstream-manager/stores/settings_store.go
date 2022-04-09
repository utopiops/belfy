package stores

import (
	"gitlab.com/utopiops-water/logstream-manager/db"
)

func NewSettingsStore(db *db.DB) SettingsStore {
	return &settingsStore{db}
}

type SettingsStore interface {
	// GetMigrationHistoryRows retrieves rows of migration_history table
	GetMigrationHistoryRows() ([]string, error)

	// IsCreated checks that a table is really created or not
	IsCreated(table string) (created bool, err error)
}

type settingsStore struct {
	db *db.DB
}
