package stores

import (
	"context"
	"errors"
	"log"

	"gitlab.com/utopiops-water/git-integration/db"
)

// DeleteGitlabApplicationSettings deletes the application service provider and gitlab application settings.
func (store *settingsStore) DeleteGitlabApplicationSettings(ctx context.Context, accountID, environmentName, applicationName string) (err error) {

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

			deleteGitlabApplicationSettings = `
DELETE FROM gitlab_application_settings
WHERE id = $1
`
			deleteServiceProvider = `
DELETE FROM APPLICATION_SERVICE_PROVIDER
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3
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

		// Get settings_id for delete from gitlab_application_settings table
		var settingsId int
		err = tx.Get(&settingsId, getSettingsId, accountID, environmentName, applicationName)
		if err != nil {
			return err
		}

		_, err = tx.Exec(deleteGitlabApplicationSettings, settingsId)
		if err != nil {
			return
		}

		_, err = tx.Exec(deleteServiceProvider, accountID, environmentName, applicationName)
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
