package stores

import (
	"fmt"

	"gitlab.com/utopiops-water/secret-manager/db"
)

// get rows of migration_history table
func (store *simpleSecretStore) IsCreated(table string) (created bool, err error) {
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = fmt.Sprintf("SELECT 1 FROM %s", table)
	}
	_, err = store.db.Connection.Exec(statement)

	if err != nil {
		created = false
		return
	}
	created = true
	return
}
