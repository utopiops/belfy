package stores

import (
	"context"
	"errors"
	"log"

	"gitlab.com/utopiops-water/git-integration/db"
)

// SetBitbucketApplicationSettings sets the application service provider and bitbucket application settings.
func (store *settingsStore) SetBitbucketApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, repoFullName string) (err error) {

	switch store.db.Driver {
	case db.Postgres:

		// queries
		const (
			countExistingProvider = `
SELECT count(*) FROM APPLICATION_SERVICE_PROVIDER
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3
`
			// 			deleteExistingSetting = `
			// DELETE FROM %s_application_settings
			// WHERE id = $1
			// `
			insertBitbucketApplicationSettings = `
INSERT INTO bitbucket_application_settings (repo_full_name)
VALUES ($1) RETURNING id 
`
			insertServiceProvider = `
INSERT INTO application_service_provider (environment_name, application_name, account_id, integration_name, integration_service, settings_id)
VALUES ($1, $2, $3, $4, 'bitbucket', $5) 
`
		)

		tx := store.db.Connection.MustBegin()
		// Check if the provider is already set
		var count int
		err = tx.Get(&count, countExistingProvider, accountID, environmentName, applicationName)
		if err != nil {
			return err
		}
		if count != 0 {
			return errors.New("Provider is already set for the application")
		}

		var settingsId int
		err = tx.QueryRow(insertBitbucketApplicationSettings, repoFullName).Scan(&settingsId)
		if err != nil {
			return
		}

		_, err = tx.Exec(insertServiceProvider, environmentName, applicationName, accountID, integrationName, settingsId)
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
