package stores

import (
	"context"
	"database/sql"
	"errors"
	"log"

	"gitlab.com/utopiops-water/log-integration/db"
	"gitlab.com/utopiops-water/log-integration/models"
)

// GetSimpleSecret retrieves a simple secret by its name
func (store *settingsStore) GetCloudwatchApplicationSettings(ctx context.Context, accountID, environmentName, applicationName string) (setting *models.CloudwatchSetting, err error) {

	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = `
SELECT cws.* FROM application_settings_base asb
JOIN cloudwatch_application_settings cws ON asb.settings_id = cws.id
WHERE account_id = $1 AND environment_name = $2 AND application_name = $3
`
	}

	s := models.CloudwatchSetting{}
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
