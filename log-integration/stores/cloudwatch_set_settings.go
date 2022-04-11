package stores

import (
	"context"
	"errors"
	"fmt"
	"log"

	"gitlab.com/utopiops-water/log-integration/db"
)

// SetCloudwatchApplicationSettings sets the application service provider and cloudwatch application settings.
func (store *settingsStore) SetCloudwatchApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, region string) (err error) {

	switch store.db.Driver {
	case db.Postgres:

		// queries
		const (
			countExistingProvider = `
SELECT count(*) FROM application_settings_base
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3
`
			insertGitlabApplicationSettings = `
INSERT INTO cloudwatch_application_settings (region)
VALUES ($1) RETURNING id 
`
			insertServiceProvider = `
INSERT INTO application_settings_base (environment_name, application_name, account_id, integration_service, settings_id)
VALUES ($1, $2, $3, 'cloudwatch', $4) 
`
		)

		tx := store.db.Connection.MustBegin()
		// Check if the provider is already set
		var count int
		err = tx.Get(&count, countExistingProvider, accountID, environmentName, applicationName)
		if err != nil {
			return
		}
		if count != 0 {
			return errors.New("Provider is already set for the application")
		}

		var settingsId int
		fmt.Println("region", region)

		err = tx.QueryRow(insertGitlabApplicationSettings, region).Scan(&settingsId)
		if err != nil {
			return
		}

		_, err = tx.Exec(insertServiceProvider, environmentName, applicationName, accountID, settingsId)
		if err != nil {
			rollbackErr := tx.Rollback()
			if rollbackErr != nil {
				log.Panicln("Rollback failed", rollbackErr) // possible data inconsistency
			}
			return
		}
		err = tx.Commit()
		if err != nil {
			rollbackErr := tx.Rollback()
			if rollbackErr != nil {
				log.Panicln("Rollback failed", rollbackErr) // possible data inconsistency
			}
			return
		}
	}

	return
}
