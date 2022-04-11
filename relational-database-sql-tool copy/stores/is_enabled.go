package stores

import (
	"context"
	"log"

	"gitlab.com/utopiops-water/relational-database-sql-tool/db"
)

// GetSimpleSecret retrieves a simple secret by its name
func (store *settingsStore) IsEnabled(ctx context.Context, accountID, environmentName, databaseName string) (enabled bool, err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = get_service_name
	}

	err = store.db.Connection.Get(&enabled, statement, accountID, environmentName, databaseName)
	if err != nil {
		log.Println(err.Error())
		return
	}

	return
}

// Select query
const get_service_name = `
SELECT EXISTS(SELECT 1 FROM database_settings_base WHERE account_id = $1 AND environment_name = $2 AND database_name = $3) as is_enabled;
`
