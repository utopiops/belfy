package stores

import (
	"context"
	"errors"
	"log"

	"gitlab.com/utopiops-water/relational-database-sql-tool/db"
	"gitlab.com/utopiops-water/relational-database-sql-tool/models"
)

// SetRDSDatabaseSettings sets the RDS database settings.
func (store *settingsStore) SetRDSDatabaseSettings(ctx context.Context, rdsSettings *models.RDSSetting) (err error) {

	switch store.db.Driver {
	case db.Postgres:

		// queries
		const (
			countExistingProvider = `
SELECT count(*) FROM database_settings_base
WHERE account_id = $1 AND environment_name = $2 AND database_name = $3
`
			insertServiceProvider = `
INSERT INTO database_settings_base (environment_name, database_name, account_id, database_engine, database_kind)
VALUES ($1, $2, $3, $4, 'rds') RETURNING id
`
			insertGitlabApplicationSettings = `
INSERT INTO rds_database_settings (database_id, lambda_name, region, dns, database_kind)
VALUES ($1, $2, $3, $4, 'rds')
`
		)

		tx := store.db.Connection.MustBegin()
		// Check if the provider is already set
		var count int
		err = tx.Get(&count, countExistingProvider, rdsSettings.AccountID, rdsSettings.EnvironmentName, rdsSettings.DatabaseName)
		if err != nil {
			return
		}
		if count != 0 {
			return errors.New("Database query tool is already enabled for the application")
		}

		var id int
		err = tx.QueryRow(insertServiceProvider, rdsSettings.EnvironmentName, rdsSettings.DatabaseName, rdsSettings.AccountID, rdsSettings.Engine).Scan(&id)
		if err != nil {
			return
		}

		_, err = tx.Exec(insertGitlabApplicationSettings, id, rdsSettings.LambdaName, rdsSettings.Region, rdsSettings.DNS)
		if err != nil {
			rollbackErr := tx.Rollback()
			if rollbackErr != nil {
				log.Panicln("Rollback failed", rollbackErr) // possible data inconsistency?
			}
			return
		}
		err = tx.Commit()
		if err != nil {
			rollbackErr := tx.Rollback()
			if rollbackErr != nil {
				log.Panicln("Rollback failed", rollbackErr) // possible data inconsistency?
			}
			return
		}
	}

	return
}
