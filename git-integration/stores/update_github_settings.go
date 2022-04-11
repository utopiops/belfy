package stores

import (
	"context"
	"errors"
	"log"

	"gitlab.com/utopiops-water/git-integration/db"
)

// DeleteGithubApplicationSettings deletes the application service provider and github application settings.
func (store *settingsStore) UpdateGithubApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, repoFullName string) (err error) {

	switch store.db.Driver {
	case db.Postgres:

		// queries
		const (
			countExistingProvider = `
SELECT count(*) FROM APPLICATION_SERVICE_PROVIDER
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3
`
			getSettingsId = `
SELECT settings_id FROM APPLICATION_SERVICE_PROVIDER
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3			
`

			updateGithubApplicationSettings = `
UPDATE github_application_settings
SET repo_full_name = $1
WHERE id = $2
`
			updateServiceProvider = `
UPDATE APPLICATION_SERVICE_PROVIDER
SET integration_name = $1
WHERE account_id = $2 AND environment_name = $3 AND application_name = $4
`
		)

		tx := store.db.Connection.MustBegin()
		// Check the provider is already set or not
		var count int
		err = tx.Get(&count, countExistingProvider, accountID, environmentName, applicationName)
		if err != nil {
			return err
		}
		if count == 0 {
			return errors.New("Provider isn't already set for the application")
		}

		// Get settings_id for update github_application_settings table
		var settingsId int
		err = tx.Get(&settingsId, getSettingsId, accountID, environmentName, applicationName)
		if err != nil {
			return err
		}

		_, err = tx.Exec(updateGithubApplicationSettings, repoFullName, settingsId)
		if err != nil {
			return
		}

		_, err = tx.Exec(updateServiceProvider, integrationName, accountID, environmentName, applicationName)
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
