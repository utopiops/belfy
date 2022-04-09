package stores

import (
	"context"
	"database/sql"
	"errors"
	"log"

	"gitlab.com/utopiops-water/log-integration/db"
)

// GetSimpleSecret retrieves a simple secret by its name
func (store *settingsStore) GetServiceName(ctx context.Context, accountID, environmentName, applicationName string) (name string, err error) {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = get_service_name
	}

	var nullableName sql.NullString
	err = store.db.Connection.Get(&nullableName, statement, accountID, environmentName, applicationName)
	if nullableName.Valid {
		name = nullableName.String
	}
	if err != nil {
		log.Println(err.Error())
		if err == sql.ErrNoRows {
			err = errors.New("Not found")
		}
		return
	}

	return
}

// Select query
const get_service_name = `
SELECT integration_service FROM application_settings_base
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3
`
