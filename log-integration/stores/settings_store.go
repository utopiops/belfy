package stores

import (
	"context"

	"gitlab.com/utopiops-water/log-integration/db"
	"gitlab.com/utopiops-water/log-integration/models"
)

func NewSettingsStore(db *db.DB) SettingsStore {
	return &settingsStore{db}
}

type SettingsStore interface {
	// Store a simple secret
	GetServiceName(ctx context.Context, accountID, environmentName, applicationName string) (name string, err error)

	// Cloudwatch
	SetCloudwatchApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, projectID string) (err error)
	GetCloudwatchApplicationSettings(ctx context.Context, accountID, environmentName, applicationName string) (setting *models.CloudwatchSetting, err error)
}

type settingsStore struct {
	db *db.DB
}
