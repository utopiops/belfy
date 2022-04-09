package stores

import (
	"context"
	"database/sql"
	"errors"
	"log"

	"gitlab.com/utopiops-water/relational-database-sql-tool/db"
	"gitlab.com/utopiops-water/relational-database-sql-tool/models"
)

// GetSimpleSecret retrieves a simple secret by its name
func (store *settingsStore) GetRDSDatabaseSettings(ctx context.Context, accountID, environmentName, databaseName string) (setting *models.RDSSetting, err error) {

	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = `
SELECT ras.*, dsb.account_id, dsb.environment_name, dsb.database_engine FROM database_settings_base dsb
JOIN rds_database_settings ras ON dsb.id = ras.database_id
WHERE account_id = $1 AND environment_name = $2 AND database_name = $3
`
	}

	s := models.RDSSetting{}
	err = store.db.Connection.QueryRowx(statement, accountID, environmentName, databaseName).StructScan(&s)

	if err != nil {
		log.Println(err.Error())
		if err == sql.ErrNoRows {
			err = errors.New("Not found")
		}
		return
	}
	setting = &s
	return
}
