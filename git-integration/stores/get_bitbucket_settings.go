package stores

import (
	"context"
	"database/sql"
	"errors"
	"log"

	"gitlab.com/utopiops-water/git-integration/db"
	"gitlab.com/utopiops-water/git-integration/models"
)

// GetSimpleSecret retrieves a simple secret by its name
func (store *settingsStore) GetBitbucketSettings(ctx context.Context, accountID, environmentName, applicationName string) (setting *models.BitbucketSettings, err error) {

	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = `
SELECT bas.*, asp.integration_name FROM application_service_provider asp
JOIN bitbucket_application_settings bas ON asp.settings_id = bas.id
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3
`
	}

	s := models.BitbucketSettings{}
	err = store.db.Connection.QueryRowx(statement, accountID, environmentName, applicationName).StructScan(&s)

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
